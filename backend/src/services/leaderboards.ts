import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { isMomentLocked } from '../lib/moment';
import { withDbRetry } from '../lib/tx';

const TEMP_LOCK_DAYS = 7; // trava temporária de leaderboard (regra 8/12)

// ------------------------------------------------------------------ leitura

export async function listLeaderboards(db: PrismaClient, userId?: string) {
  const boards = await db.leaderboard.findMany({ orderBy: { name: 'asc' } });
  const out = [];
  for (const b of boards) {
    const top = await db.leaderboardEntry.findMany({
      where: { leaderboardId: b.id },
      include: { user: { select: { username: true } } },
      orderBy: { points: 'desc' },
      take: 3,
    });
    const mine = userId
      ? await db.leaderboardEntry.findFirst({ where: { leaderboardId: b.id, userId } })
      : null;
    out.push({
      id: b.id,
      kind: b.kind,
      refKey: b.refKey,
      name: b.name,
      snapshotAt: b.snapshotAt ? b.snapshotAt.toISOString() : null,
      rewards: b.rewardsJson,
      top: top.map((e) => ({ username: e.user.username, points: e.points, rank: e.rank })),
      myPoints: mine?.points ?? null,
      myRank: mine?.rank ?? null,
    });
  }
  return out;
}

export async function getLeaderboard(db: PrismaClient, id: string, userId?: string) {
  const b = await db.leaderboard.findUnique({ where: { id } });
  if (!b) throw notFound('Ranking não encontrado');
  const entries = await db.leaderboardEntry.findMany({
    where: { leaderboardId: id },
    include: { user: { select: { username: true } } },
    orderBy: { points: 'desc' },
    take: 50,
  });

  // Lances elegíveis do usuário para travar: do clube (TEAM) ou do jogador (PLAYER),
  // possuídos, não queimados, não travados e ainda não submetidos.
  let eligible: { id: string; serial: number; playerName: string; points: number }[] = [];
  if (userId && !b.snapshotAt) {
    const moments = await db.moment.findMany({
      where: {
        ownerId: userId,
        burned: false,
        template: b.kind === 'TEAM' ? { player: { club: b.refKey } } : { playerId: b.refKey },
      },
      include: { template: { include: { player: true } } },
    });
    const lockedIds = new Set(
      (await db.leaderboardLock.findMany({ where: { momentId: { in: moments.map((m) => m.id) } }, select: { momentId: true } })).map((l) => l.momentId),
    );
    eligible = moments
      .filter((m) => !isMomentLocked(m) && !lockedIds.has(m.id))
      .map((m) => ({ id: m.id, serial: m.serial, playerName: m.template.player.name, points: m.topShotScore }));
  }

  return {
    id: b.id,
    kind: b.kind,
    refKey: b.refKey,
    name: b.name,
    snapshotAt: b.snapshotAt ? b.snapshotAt.toISOString() : null,
    rewards: b.rewardsJson,
    entries: entries.map((e, i) => ({ username: e.user.username, points: e.points, rank: e.rank ?? i + 1 })),
    eligibleMoments: eligible,
  };
}

// ------------------------------------------------------------------ travar p/ pontuar

/** Sobe no ranking TRAVANDO um Moment (regra 12): tempLock + entry.points += Pontuação do Moment. */
export async function lockToLeaderboard(db: PrismaClient, userId: string, leaderboardId: string, momentId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const b = await tx.leaderboard.findUnique({ where: { id: leaderboardId } });
      if (!b) throw notFound('Ranking não encontrado');
      if (b.snapshotAt) throw badRequest('Ranking já encerrado (snapshot feito)');

      const moment = await tx.moment.findUnique({ where: { id: momentId }, include: { template: { include: { player: true } } } });
      if (!moment || moment.ownerId !== userId || moment.burned) throw badRequest('Momento inválido');
      if (isMomentLocked(moment)) throw badRequest('Momento já está travado');
      const matches = b.kind === 'TEAM' ? moment.template.player.club === b.refKey : moment.template.playerId === b.refKey;
      if (!matches) throw badRequest('Momento não pertence a este ranking');
      if (await tx.leaderboardLock.findUnique({ where: { momentId } })) throw badRequest('Momento já submetido a um ranking');

      await tx.leaderboardLock.create({ data: { leaderboardId, momentId, userId } });
      await tx.moment.update({ where: { id: momentId }, data: { tempLockUntil: new Date(Date.now() + TEMP_LOCK_DAYS * 86_400_000) } });
      await tx.listing.updateMany({ where: { momentId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });

      const existing = await tx.leaderboardEntry.findFirst({ where: { leaderboardId, userId } });
      const entry = existing
        ? await tx.leaderboardEntry.update({ where: { id: existing.id }, data: { points: { increment: moment.topShotScore } } })
        : await tx.leaderboardEntry.create({ data: { leaderboardId, userId, points: moment.topShotScore } });
      return { locked: true, points: entry.points };
    }),
  );
}

// ------------------------------------------------------------------ snapshot (admin)

/** Snapshot encerra o ranking: define ranks, distribui prêmio do top 1 e libera as travas. */
export async function snapshotLeaderboard(db: PrismaClient, leaderboardId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const b = await tx.leaderboard.findUnique({ where: { id: leaderboardId } });
      if (!b) throw notFound('Ranking não encontrado');
      if (b.snapshotAt) throw badRequest('Snapshot já foi feito');

      const entries = await tx.leaderboardEntry.findMany({ where: { leaderboardId }, orderBy: { points: 'desc' } });
      for (let i = 0; i < entries.length; i++) {
        await tx.leaderboardEntry.update({ where: { id: entries[i].id }, data: { rank: i + 1 } });
      }

      // prêmio do top 1 (rewardsJson.top1PackId → PackInventory)
      let rewarded: string | null = null;
      const rewards = (b.rewardsJson ?? {}) as { top1PackId?: string };
      if (entries.length > 0 && rewards.top1PackId) {
        await tx.packInventory.create({ data: { packId: rewards.top1PackId, ownerId: entries[0].userId } });
        rewarded = entries[0].userId;
      }

      // libera as travas temporárias dos Moments submetidos
      const locks = await tx.leaderboardLock.findMany({ where: { leaderboardId } });
      if (locks.length) {
        await tx.moment.updateMany({ where: { id: { in: locks.map((l) => l.momentId) } }, data: { tempLockUntil: null } });
        await tx.leaderboardLock.deleteMany({ where: { leaderboardId } });
      }

      await tx.leaderboard.update({ where: { id: leaderboardId }, data: { snapshotAt: new Date() } });
      return { snapshot: true, entries: entries.length, top1Rewarded: !!rewarded };
    }),
  );
}
