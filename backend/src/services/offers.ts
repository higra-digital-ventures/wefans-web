import type { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { toOfferDTO } from '../lib/dto';
import { withDbRetry } from '../lib/tx';
import { settleSale } from './market';

export interface CreateOfferInput {
  momentId?: string;
  templateId?: string;
  priceCents: number;
  expiresAt?: string;
}

/** Ofertar em um Moment específico OU em qualquer Moment de uma edição (regra 7). */
export async function createOffer(db: PrismaClient, userId: string, input: CreateOfferInput) {
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) throw badRequest('Preço inválido');
  if (!input.momentId && !input.templateId) throw badRequest('Informe um Momento ou uma edição');

  if (input.momentId) {
    const moment = await db.moment.findUnique({ where: { id: input.momentId } });
    if (!moment || moment.burned) throw notFound('Momento não encontrado');
    if (moment.ownerId === userId) throw badRequest('Você já é dono deste Momento');
  } else {
    const tpl = await db.template.findUnique({ where: { id: input.templateId } });
    if (!tpl || tpl.status !== 'PUBLICADO') throw notFound('Momento não encontrado');
  }

  const offer = await db.offer.create({
    data: {
      momentId: input.momentId ?? null,
      templateId: input.templateId ?? null,
      buyerId: userId,
      priceCents: input.priceCents,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    include: { moment: { include: { template: { include: { player: true } } } }, template: { include: { player: true } } },
  });
  return toOfferDTO(offer);
}

export async function listMyOffers(db: PrismaClient, userId: string) {
  const offers = await db.offer.findMany({
    where: { buyerId: userId, status: 'ACTIVE' },
    include: { moment: { include: { template: { include: { player: true } } } }, template: { include: { player: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return offers.map(toOfferDTO);
}

/** Ofertas que o dono de um Moment pode aceitar: no serial específico OU na edição. */
export async function listOffersForMoment(db: PrismaClient, momentId: string) {
  const moment = await db.moment.findUnique({ where: { id: momentId }, select: { templateId: true } });
  if (!moment) return [];
  const offers = await db.offer.findMany({
    where: { status: 'ACTIVE', OR: [{ momentId }, { templateId: moment.templateId }] },
    include: { buyer: { select: { username: true } } },
    orderBy: { priceCents: 'desc' },
  });
  return offers.map((o) => ({
    id: o.id,
    priceCents: o.priceCents,
    buyer: o.buyer.username,
    scope: o.momentId ? 'serial' : 'edition',
    createdAt: o.createdAt.toISOString(),
    expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
  }));
}

export async function cancelOffer(db: PrismaClient, userId: string, offerId: string) {
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.buyerId !== userId) throw notFound('Oferta não encontrada');
  if (offer.status !== 'ACTIVE') throw badRequest('Oferta não está ativa');
  await db.offer.update({ where: { id: offerId }, data: { status: 'CANCELLED' } });
  return { ok: true };
}

/** O dono aceita uma oferta — executa como venda (regra 7). Para oferta de edição, escolhe o Moment. */
export async function acceptOffer(db: PrismaClient, sellerId: string, offerId: string, momentId?: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({ where: { id: offerId } });
      if (!offer || offer.status !== 'ACTIVE') throw badRequest('Oferta indisponível');
      if (offer.expiresAt && offer.expiresAt < new Date()) throw badRequest('Oferta expirada');
      if (offer.buyerId === sellerId) throw badRequest('Não é possível aceitar a própria oferta');

      const targetMomentId = offer.momentId ?? momentId;
      if (!targetMomentId) throw badRequest('Escolha um Momento da edição para vender');
      if (offer.momentId && offer.momentId !== targetMomentId) throw badRequest('Momento não corresponde à oferta');

      const moment = await tx.moment.findUnique({ where: { id: targetMomentId } });
      if (!moment || moment.ownerId !== sellerId) throw badRequest('Você não é dono deste Momento');
      if (offer.templateId && moment.templateId !== offer.templateId) throw badRequest('Momento não é da edição ofertada');

      const res = await settleSale(tx, { momentId: targetMomentId, buyerId: offer.buyerId, sellerId, priceCents: offer.priceCents, txType: 'OFFER_ACCEPT' });
      await tx.offer.update({ where: { id: offer.id }, data: { status: 'ACCEPTED' } });
      return res;
    }),
  );
}
