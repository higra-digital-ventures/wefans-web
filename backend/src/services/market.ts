import { Prisma, type PrismaClient, type Tier } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { toListingDTO, toTemplateDTO } from '../lib/dto';
import { isMomentLocked } from '../lib/moment';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';
import { PLATFORM_FEE_BPS, CLUB_ROYALTY_BPS, creditTeam } from '../lib/royalty';

const ASP_WINDOW = 10; // média móvel sobre as últimas N vendas
const TX_OPTS = { timeout: 15_000, maxWait: 10_000 } as const;

// ---------------------------------------------------------------- listar / cancelar

/** Cria (ou re-ativa) o anúncio de um Moment. Listing é único por Moment (schema). */
export async function createListing(db: PrismaClient, userId: string, momentId: string, priceCents: number) {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw badRequest('Preço inválido');
  return db.$transaction(async (tx) => {
    const moment = await tx.moment.findUnique({ where: { id: momentId } });
    if (!moment || moment.ownerId !== userId) throw notFound('Momento não encontrado');
    if (moment.burned) throw badRequest('Momento queimado não pode ser listado');
    if (isMomentLocked(moment)) throw badRequest('Momento travado não pode ser listado');
    const listing = await tx.listing.upsert({
      where: { momentId },
      create: { momentId, sellerId: userId, priceCents, status: 'ACTIVE' },
      update: { sellerId: userId, priceCents, status: 'ACTIVE' },
    });
    return toListingDTO(listing);
  });
}

export async function cancelListing(db: PrismaClient, userId: string, listingId: string) {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) throw notFound('Anúncio não encontrado');
  if (listing.status !== 'ACTIVE') throw badRequest('Anúncio não está ativo');
  await db.listing.update({ where: { id: listingId }, data: { status: 'CANCELLED' } });
  return { ok: true };
}

// ---------------------------------------------------------------- comprar (Buy Now)

/**
 * Compra a preço fixo (regra 6): transfere dono, debita comprador, credita vendedor
 * menos taxa 5%, registra Transaction(BUY), atualiza ASP (média móvel), recalcula a
 * Pontuação wefans dos dois e sinaliza preço anômalo (> 3× ASP). Tudo atômico.
 */
/**
 * Núcleo de liquidação de uma venda (Buy Now OU oferta aceita). Roda dentro de $transaction.
 * Débito do comprador (sem overspend), crédito do vendedor − taxa 5%, transferência de dono,
 * Pontuação wefans dinâmica (max(preço, ASP)), ASP (média móvel), flag anti-anômalo e
 * recálculo da Pontuação dos dois. Reusado por buyMoment e acceptOffer.
 */
export async function settleSale(
  tx: Prisma.TransactionClient,
  opts: { momentId: string; buyerId: string; sellerId: string; priceCents: number; txType: 'BUY' | 'OFFER_ACCEPT' },
) {
  const { momentId, buyerId, sellerId, priceCents: price, txType } = opts;
  const moment = await tx.moment.findUnique({ where: { id: momentId }, include: { template: true } });
  if (!moment) throw notFound('Momento não encontrado');
  if (moment.burned || isMomentLocked(moment)) throw badRequest('Momento indisponível');
  if (moment.ownerId !== sellerId) throw badRequest('Vendedor não é mais o dono do Momento');
  if (buyerId === sellerId) throw badRequest('Comprador e vendedor são o mesmo');

  const oldAsp = moment.template.aspCents;
  // Split: vendedor sempre -10% (5% plataforma + 5% clube). O clube só fatura
  // com vínculo (template.teamId); sem parceria, a fatia do clube vira plataforma.
  const platformFee = Math.round((price * PLATFORM_FEE_BPS) / 10_000);
  const clubSlice = Math.round((price * CLUB_ROYALTY_BPS) / 10_000);
  const teamId = moment.template.teamId;
  const clubCut = teamId ? clubSlice : 0;
  const platformCut = platformFee + (teamId ? 0 : clubSlice);
  const proceeds = price - platformFee - clubSlice;

  const rows = await tx.$queryRaw<Array<{ balanceCents: number }>>(Prisma.sql`
    UPDATE "User" SET "balanceCents" = "balanceCents" - ${price}
    WHERE "id" = ${buyerId} AND "balanceCents" >= ${price}
    RETURNING "balanceCents"
  `);
  if (rows.length === 0) throw badRequest('Saldo insuficiente');
  const buyerBalance = Number(rows[0].balanceCents);

  const seller = await tx.user.update({ where: { id: sellerId }, data: { balanceCents: { increment: proceeds } } });
  if (teamId && clubCut > 0) {
    await creditTeam(tx, teamId, clubCut, 'ROYALTY', momentId, `Royalty de revenda: ${moment.template.title}`);
  }

  const newScore = Math.round((Math.max(price, oldAsp) / 100) * 10);
  await tx.moment.update({ where: { id: momentId }, data: { ownerId: buyerId, acquiredPriceCents: price, topShotScore: newScore } });

  const flagged = oldAsp > 0 && price > oldAsp * 3; // anti-anômalo (Conduta)
  await tx.transaction.create({ data: { type: txType, momentId, buyerId, sellerId, amountCents: price, feeCents: platformCut, flagged } });
  await tx.walletTransaction.create({ data: { userId: buyerId, type: 'PURCHASE', amountCents: -price, balanceAfterCents: buyerBalance, memo: `Compra: ${moment.template.title}` } });
  await tx.walletTransaction.create({ data: { userId: sellerId, type: 'SALE', amountCents: proceeds, balanceAfterCents: seller.balanceCents, memo: `Venda: ${moment.template.title} (taxa ${platformFee}${clubCut > 0 ? ` · royalty clube ${clubCut}` : ''})` } });

  const recent = await tx.transaction.findMany({
    where: { type: { in: ['BUY', 'OFFER_ACCEPT'] }, moment: { templateId: moment.templateId } },
    orderBy: { createdAt: 'desc' },
    take: ASP_WINDOW,
    select: { amountCents: true },
  });
  const asp = Math.round(recent.reduce((s, t) => s + t.amountCents, 0) / recent.length);
  await tx.template.update({ where: { id: moment.templateId }, data: { aspCents: asp } });

  await recomputeUserScores(tx, buyerId);
  await recomputeUserScores(tx, sellerId);

  return { momentId, priceCents: price, feeCents: platformCut, balanceCents: buyerBalance, flagged };
}

export async function buyMoment(db: PrismaClient, buyerId: string, listingId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing || listing.status !== 'ACTIVE') throw badRequest('Anúncio indisponível');
      if (listing.sellerId === buyerId) throw badRequest('Não é possível comprar o próprio anúncio');
      const res = await settleSale(tx, {
        momentId: listing.momentId,
        buyerId,
        sellerId: listing.sellerId,
        priceCents: listing.priceCents,
        txType: 'BUY',
      });
      await tx.listing.update({ where: { id: listing.id }, data: { status: 'SOLD' } });
      return res;
    }, TX_OPTS),
  );
}

// ---------------------------------------------------------------- listagens / feed

export async function listMarket(
  db: PrismaClient,
  filters: { tier?: Tier },
  sort: 'recent' | 'price_asc' | 'price_desc' = 'recent',
) {
  const listings = await db.listing.findMany({
    where: { status: 'ACTIVE', ...(filters.tier ? { moment: { template: { tier: filters.tier } } } : {}) },
    include: { moment: { include: { template: { include: { player: true } } } }, seller: { select: { username: true } } },
    orderBy: sort === 'price_asc' ? { priceCents: 'asc' } : sort === 'price_desc' ? { priceCents: 'desc' } : { createdAt: 'desc' },
    take: 120,
  });
  return listings.map((l) => ({
    listingId: l.id,
    priceCents: l.priceCents,
    seller: l.seller.username,
    createdAt: l.createdAt.toISOString(),
    momentId: l.moment.id,
    serial: l.moment.serial,
    template: toTemplateDTO(l.moment.template),
  }));
}

/** Feed de vendas ao vivo (seção 11.3). */
export async function listRecentSales(db: PrismaClient, limit = 25) {
  const txs = await db.transaction.findMany({
    where: { type: { in: ['BUY', 'OFFER_ACCEPT'] } },
    include: {
      moment: { include: { template: { include: { player: true } } } },
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50),
  });
  return txs.map((t) => ({
    id: t.id,
    priceCents: t.amountCents,
    buyer: t.buyer?.username ?? null,
    seller: t.seller?.username ?? null,
    createdAt: t.createdAt.toISOString(),
    momentId: t.moment.id,
    serial: t.moment.serial,
    flagged: t.flagged,
    template: toTemplateDTO(t.moment.template),
  }));
}

/** Floor, ASP, nº à venda e vendas recentes (Pricing Helper) de uma edição. */
export async function getTemplateMarket(db: PrismaClient, templateId: string) {
  const now = new Date();
  const lockedCount = await db.moment.count({
    where: { templateId, burned: false, OR: [{ locked: true, lockedUntil: { gt: now } }, { tempLockUntil: { gt: now } }] },
  });
  const [template, floor, activeListings, recentSales] = await Promise.all([
    db.template.findUnique({ where: { id: templateId }, select: { aspCents: true } }),
    db.listing.findFirst({
      where: { status: 'ACTIVE', moment: { templateId } },
      orderBy: { priceCents: 'asc' },
      include: { moment: { select: { id: true } } },
    }),
    db.listing.count({ where: { status: 'ACTIVE', moment: { templateId } } }),
    db.transaction.findMany({
      where: { type: 'BUY', moment: { templateId } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        amountCents: true,
        createdAt: true,
        buyer: { select: { username: true } },
        moment: { select: { serial: true } },
      },
    }),
  ]);
  if (!template) throw notFound('Momento não encontrado');
  return {
    aspCents: template.aspCents,
    floorCents: floor?.priceCents ?? null,
    floorListingId: floor?.id ?? null,
    floorMomentId: floor?.moment.id ?? null,
    activeListings,
    lockedCount,
    recentSales: recentSales.map((s) => ({
      amountCents: s.amountCents,
      createdAt: s.createdAt.toISOString(),
      buyer: s.buyer?.username ?? null,
      serial: s.moment.serial,
    })),
  };
}
