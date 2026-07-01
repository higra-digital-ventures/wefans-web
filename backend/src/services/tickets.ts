import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { isMomentLocked } from '../lib/moment';
import { toPackDTO } from '../lib/dto';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';

const TICKETS_PER_PACK = 3; // custo em Fichas de Troca por pacote ticketOnly

/** Cada Moment vira 1 Ficha de Troca, consumindo (queimando) o Moment (regra 13). */
export async function redeemMomentForTicket(db: PrismaClient, userId: string, momentId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const moment = await tx.moment.findUnique({ where: { id: momentId } });
      if (!moment || moment.ownerId !== userId) throw notFound('Momento não encontrado');
      if (moment.burned) throw badRequest('Momento já foi queimado');
      if (isMomentLocked(moment)) throw badRequest('Momento travado');
      await tx.listing.updateMany({ where: { momentId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
      await tx.moment.update({ where: { id: momentId }, data: { burned: true, ownerId: null } });
      await tx.template.update({ where: { id: moment.templateId }, data: { circulatingCount: { decrement: 1 } } });
      await tx.transaction.create({ data: { type: 'BURN', momentId, sellerId: userId, amountCents: 0 } });
      const user = await tx.user.update({ where: { id: userId }, data: { tradeTickets: { increment: 1 } } });
      await recomputeUserScores(tx, userId);
      return { tradeTickets: user.tradeTickets };
    }),
  );
}

export async function listTicketPacks(db: PrismaClient) {
  const packs = await db.pack.findMany({ where: { ticketOnly: true } });
  return packs.map((p) => ({ ...toPackDTO(p), ticketCost: TICKETS_PER_PACK }));
}

/** Troca N fichas por um pacote exclusivo (ticketOnly). */
export async function redeemTicketsForPack(db: PrismaClient, userId: string, packId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const pack = await tx.pack.findUnique({ where: { id: packId } });
      if (!pack || !pack.ticketOnly) throw badRequest('Pacote não é trocável por fichas');
      const rows = await tx.$queryRaw<Array<{ tradeTickets: number }>>(Prisma.sql`
        UPDATE "User" SET "tradeTickets" = "tradeTickets" - ${TICKETS_PER_PACK}
        WHERE "id" = ${userId} AND "tradeTickets" >= ${TICKETS_PER_PACK}
        RETURNING "tradeTickets"
      `);
      if (rows.length === 0) throw badRequest(`Fichas insuficientes (precisa de ${TICKETS_PER_PACK})`);
      const inv = await tx.packInventory.create({ data: { packId, ownerId: userId } });
      return { inventoryId: inv.id, tradeTickets: Number(rows[0].tradeTickets) };
    }),
  );
}
