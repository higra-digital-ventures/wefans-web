import type { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { isMomentLocked } from '../lib/moment';
import { withDbRetry } from '../lib/tx';

const ONE_YEAR_MS = 365 * 24 * 3_600_000;

/** Travar (regra 8): trava por 1 ano; cancela anúncio ativo. Não vende/queima/presenteia enquanto travado. */
export async function lockMoment(db: PrismaClient, userId: string, momentId: string) {
  return db.$transaction(async (tx) => {
    const moment = await tx.moment.findUnique({ where: { id: momentId } });
    if (!moment || moment.ownerId !== userId) throw notFound('Momento não encontrado');
    if (moment.burned) throw badRequest('Momento queimado');
    if (isMomentLocked(moment)) throw badRequest('Momento já está travado');
    const lockedUntil = new Date(Date.now() + ONE_YEAR_MS);
    await tx.listing.updateMany({ where: { momentId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
    await tx.moment.update({ where: { id: momentId }, data: { locked: true, lockedUntil } });
    return { locked: true, lockedUntil: lockedUntil.toISOString() };
  });
}

/** Queimar (regra 9): burned=true, dono=null, decrementa circulatingCount (mantém mintedCount). */
export async function burnMoment(db: PrismaClient, userId: string, momentId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const moment = await tx.moment.findUnique({ where: { id: momentId } });
      if (!moment || moment.ownerId !== userId) throw notFound('Momento não encontrado');
      if (moment.burned) throw badRequest('Momento já foi queimado');
      if (isMomentLocked(moment)) throw badRequest('Momento travado não pode ser queimado');
      await tx.listing.updateMany({ where: { momentId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
      await tx.moment.update({ where: { id: momentId }, data: { burned: true, ownerId: null } });
      await tx.template.update({ where: { id: moment.templateId }, data: { circulatingCount: { decrement: 1 } } });
      await tx.transaction.create({ data: { type: 'BURN', momentId, sellerId: userId, amountCents: 0 } });
      const agg = await tx.moment.aggregate({ _sum: { topShotScore: true }, where: { ownerId: userId, burned: false } });
      await tx.user.update({ where: { id: userId }, data: { topShotScore: agg._sum.topShotScore ?? 0 } });
      return { burned: true };
    }),
  );
}

/** Presentear (regra 14): transfere dono sem pagamento; registra GIFT; recalcula scores dos dois. */
export async function giftMoment(db: PrismaClient, userId: string, momentId: string, toUsername: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const moment = await tx.moment.findUnique({ where: { id: momentId } });
      if (!moment || moment.ownerId !== userId) throw notFound('Momento não encontrado');
      if (moment.burned) throw badRequest('Momento queimado');
      if (isMomentLocked(moment)) throw badRequest('Momento travado não pode ser presenteado');
      const recipient = await tx.user.findUnique({ where: { username: toUsername } });
      if (!recipient) throw notFound('Usuário destinatário não encontrado');
      if (recipient.id === userId) throw badRequest('Não é possível presentear para si mesmo');
      await tx.listing.updateMany({ where: { momentId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
      await tx.moment.update({ where: { id: momentId }, data: { ownerId: recipient.id } });
      await tx.transaction.create({ data: { type: 'GIFT', momentId, sellerId: userId, buyerId: recipient.id, amountCents: 0 } });
      for (const uid of [userId, recipient.id]) {
        const agg = await tx.moment.aggregate({ _sum: { topShotScore: true }, where: { ownerId: uid, burned: false } });
        await tx.user.update({ where: { id: uid }, data: { topShotScore: agg._sum.topShotScore ?? 0 } });
      }
      return { gifted: true, to: recipient.username };
    }),
  );
}
