import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { toPackDTO } from '../lib/dto';
import { withDbRetry } from '../lib/tx';

const WINDOW_MS = 20 * 60 * 1000; // janela de compra de 20 min por posição (regra 5)
const TX_OPTS = { timeout: 15_000, maxWait: 10_000 } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dropDTO(d: {
  id: string; name: string; status: string; waitingRoomOpensAt: Date; startsAt: Date; endsAt: Date;
  requiredCollectorScore: number; hasRebound: boolean;
}) {
  return {
    id: d.id, name: d.name, status: d.status,
    waitingRoomOpensAt: d.waitingRoomOpensAt.toISOString(),
    startsAt: d.startsAt.toISOString(), endsAt: d.endsAt.toISOString(),
    requiredCollectorScore: d.requiredCollectorScore, hasRebound: d.hasRebound,
  };
}

export async function listDrops(db: PrismaClient) {
  const drops = await db.drop.findMany({
    orderBy: { startsAt: 'asc' },
    include: { packs: { include: { set: { include: { series: true } } } } },
  });
  return drops.map((d) => ({ ...dropDTO(d), packs: d.packs.map(toPackDTO) }));
}

export async function getDrop(db: PrismaClient, dropId: string, userId?: string) {
  const drop = await db.drop.findUnique({
    where: { id: dropId },
    include: { packs: { include: { set: { include: { series: true } } } } },
  });
  if (!drop) throw notFound('Drop não encontrado');
  const queueCount = await db.queueEntry.count({ where: { dropId } });

  let myEntry: unknown = null;
  let collectorScore = 0;
  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { collectorScore: true } });
    collectorScore = user?.collectorScore ?? 0;
    const e = await db.queueEntry.findUnique({ where: { dropId_userId: { dropId, userId } } });
    if (e) {
      const now = new Date();
      const windowEnds = e.windowStartsAt ? new Date(e.windowStartsAt.getTime() + WINDOW_MS) : null;
      const windowOpen = !!e.windowStartsAt && now >= e.windowStartsAt && !!windowEnds && now < windowEnds;
      const windowPassed = !!windowEnds && now >= windowEnds;
      myEntry = {
        position: e.position || null,
        windowStartsAt: e.windowStartsAt?.toISOString() ?? null,
        purchased: e.purchased,
        canBuyNow: windowOpen && !e.purchased,
        canRebound: drop.hasRebound && windowPassed && !e.purchased,
      };
    }
  }
  return {
    ...dropDTO(drop),
    packs: drop.packs.map(toPackDTO),
    eligible: collectorScore >= drop.requiredCollectorScore,
    collectorScore,
    queueCount,
    myEntry,
  };
}

/** Entra na sala de espera (regra 5): exige Score do Colecionador >= requisito. */
export async function joinWaitingRoom(db: PrismaClient, userId: string, dropId: string) {
  const drop = await db.drop.findUnique({ where: { id: dropId } });
  if (!drop) throw notFound('Drop não encontrado');
  if (drop.status !== 'SCHEDULED' && drop.status !== 'WAITING') throw badRequest('Sala de espera fechada');
  if (new Date() < drop.waitingRoomOpensAt) throw badRequest('Sala de espera ainda não abriu');
  const user = await db.user.findUnique({ where: { id: userId }, select: { collectorScore: true } });
  if ((user?.collectorScore ?? 0) < drop.requiredCollectorScore) {
    throw badRequest(`Score do Colecionador insuficiente (mínimo ${drop.requiredCollectorScore})`);
  }
  try {
    await db.queueEntry.create({ data: { dropId, userId, position: 0 } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw badRequest('Você já está na fila');
    throw e;
  }
  if (drop.status === 'SCHEDULED') await db.drop.update({ where: { id: dropId }, data: { status: 'WAITING' } });
  return { joined: true };
}

/** Inicia o drop (admin): posições ALEATÓRIAS entre os inscritos + janelas de 20 min. */
export async function startDrop(db: PrismaClient, dropId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const drop = await tx.drop.findUnique({ where: { id: dropId } });
      if (!drop) throw notFound('Drop não encontrado');
      if (drop.status === 'LIVE') throw badRequest('Drop já foi iniciado');
      const entries = shuffle(await tx.queueEntry.findMany({ where: { dropId } }));
      const now = Date.now();
      for (let i = 0; i < entries.length; i++) {
        await tx.queueEntry.update({
          where: { id: entries[i].id },
          data: { position: i + 1, windowStartsAt: new Date(now + i * WINDOW_MS) },
        });
      }
      await tx.drop.update({ where: { id: dropId }, data: { status: 'LIVE', startsAt: new Date(now) } });
      return { started: true, positions: entries.length };
    }, TX_OPTS),
  );
}

/** Relógio dos drops (padrão Top Shot: começa sozinho no horário).
 * Roda periodicamente: abre a sala de espera, inicia no startsAt (sorteia a fila)
 * e encerra no endsAt — sem depender de um admin apertar o botão. */
export async function tickDrops(db: PrismaClient) {
  const now = new Date();
  // 1) abre a sala de espera quando chega a hora
  const opened = await db.drop.updateMany({
    where: { status: 'SCHEDULED', waitingRoomOpensAt: { lte: now } },
    data: { status: 'WAITING' },
  });
  // 2) inicia no horário (gera posições + janelas)
  const toStart = await db.drop.findMany({
    where: { status: { in: ['SCHEDULED', 'WAITING'] }, startsAt: { lte: now } },
    select: { id: true },
  });
  let started = 0;
  for (const d of toStart) {
    try {
      await startDrop(db, d.id);
      started++;
    } catch {
      // já iniciado / corrida entre ticks — ignora
    }
  }
  // 3) encerra quando passa do fim
  const ended = await db.drop.updateMany({
    where: { status: { in: ['WAITING', 'LIVE'] }, endsAt: { lte: now } },
    data: { status: 'ENDED' },
  });
  return { opened: opened.count, started, ended: ended.count };
}

/** Compra na janela (ou via rebound se a janela passou e o drop tem rebound). */
export async function buyDropPack(db: PrismaClient, userId: string, dropId: string, packId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const drop = await tx.drop.findUnique({ where: { id: dropId } });
      if (!drop || drop.status !== 'LIVE') throw badRequest('Drop não está ao vivo');
      const pack = await tx.pack.findUnique({ where: { id: packId } });
      if (!pack || pack.dropId !== dropId) throw badRequest('Pacote não pertence a este drop');
      const entry = await tx.queueEntry.findUnique({ where: { dropId_userId: { dropId, userId } } });
      if (!entry) throw badRequest('Você não está na fila deste drop');
      if (entry.purchased) throw badRequest('Você já comprou neste drop');

      const now = new Date();
      const windowEnds = entry.windowStartsAt ? new Date(entry.windowStartsAt.getTime() + WINDOW_MS) : null;
      const windowOpen = !!entry.windowStartsAt && now >= entry.windowStartsAt && !!windowEnds && now < windowEnds;
      const windowPassed = !!windowEnds && now >= windowEnds;
      const viaRebound = !windowOpen && drop.hasRebound && windowPassed;
      if (!windowOpen && !viaRebound) {
        throw badRequest(entry.windowStartsAt && now < entry.windowStartsAt ? 'Aguarde sua janela de compra' : 'Fora da janela de compra');
      }

      const reserved = await tx.pack.updateMany({ where: { id: packId, soldCount: { lt: pack.totalSupply } }, data: { soldCount: { increment: 1 } } });
      if (reserved.count === 0) throw badRequest('Pacote esgotado');

      let balanceAfter = 0;
      if (pack.priceCents > 0) {
        const rows = await tx.$queryRaw<Array<{ balanceCents: number }>>(Prisma.sql`
          UPDATE "User" SET "balanceCents" = "balanceCents" - ${pack.priceCents}
          WHERE "id" = ${userId} AND "balanceCents" >= ${pack.priceCents}
          RETURNING "balanceCents"
        `);
        if (rows.length === 0) throw badRequest('Saldo insuficiente');
        balanceAfter = Number(rows[0].balanceCents);
        await tx.walletTransaction.create({ data: { userId, type: 'PURCHASE', amountCents: -pack.priceCents, balanceAfterCents: balanceAfter, memo: `Drop ${drop.name}: ${pack.name}` } });
      } else {
        balanceAfter = (await tx.user.findUnique({ where: { id: userId }, select: { balanceCents: true } }))?.balanceCents ?? 0;
      }

      const inv = await tx.packInventory.create({ data: { packId, ownerId: userId } });
      await tx.queueEntry.update({ where: { id: entry.id }, data: { purchased: true } });
      return { inventoryId: inv.id, balanceCents: balanceAfter, viaRebound };
    }, TX_OPTS),
  );
}
