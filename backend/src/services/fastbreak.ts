import type { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { isMomentLocked } from '../lib/moment';
import { simulatePlayerDay, type BoxScore } from '../lib/matchSim';
import { withDbRetry } from '../lib/tx';

const CAPTAIN_MULTIPLIER = 2; // captain conta 2× (regra 15)
const MILESTONE_WINS = 3; // marco de vitórias que concede pacote

type StatKey = 'gols' | 'assistencias' | 'defesas' | 'desarmes' | 'nota';
const normalizeStat = (s: string): StatKey =>
  (['gols', 'assistencias', 'defesas', 'desarmes', 'nota'].includes(s) ? s : s === 'notas' ? 'nota' : 'gols') as StatKey;

/** Fadiga (regra 15): usos por jogador no run dependem do ASP do Moment — mais valioso, mais usos. */
export function usesForAsp(aspCents: number): number {
  if (aspCents >= 100_000) return 5;
  if (aspCents >= 20_000) return 4;
  if (aspCents >= 5_000) return 3;
  if (aspCents >= 1_000) return 2;
  return 1;
}

const statOf = (box: BoxScore, stat: StatKey): number => box[stat];

// ------------------------------------------------------------------ leitura

export async function listRuns(db: PrismaClient, userId?: string) {
  const runs = await db.fastBreakRun.findMany({
    include: { days: { orderBy: { dayNumber: 'asc' } } },
    orderBy: { startsAt: 'asc' },
  });
  const out = [];
  for (const r of runs) {
    let myWins = 0;
    let eliminated = false;
    if (userId) {
      const myLineups = await db.fastBreakLineup.findMany({
        where: { userId, day: { runId: r.id, closedAt: { not: null } } },
      });
      myWins = myLineups.filter((l) => l.won).length;
      eliminated = r.survivor && myLineups.some((l) => !l.won);
    }
    out.push({
      id: r.id,
      name: r.name,
      survivor: r.survivor,
      lineupSize: r.lineupSize,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      myWins,
      eliminated,
      days: r.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        gameDate: d.gameDate.toISOString(),
        statKey: normalizeStat(d.statKey),
        targetScore: d.targetScore,
        closed: !!d.closedAt,
      })),
    });
  }
  return out;
}

export async function getDay(db: PrismaClient, dayId: string, userId?: string) {
  const day = await db.fastBreakDay.findUnique({ where: { id: dayId }, include: { run: true } });
  if (!day) throw notFound('Rodada não encontrada');
  const stat = normalizeStat(day.statKey);

  // leaderboard diário (após o fechamento mostra scores; antes, só quem escalou)
  const lineups = await db.fastBreakLineup.findMany({
    where: { dayId },
    include: { user: { select: { username: true } } },
    orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
  });

  let my: unknown = null;
  let eligible: { playerId: string; playerName: string; moments: { id: string; serial: number; tier: string; maxUses: number }[]; used: number; maxUses: number }[] = [];
  let eliminated = false;

  if (userId) {
    const mine = lineups.find((l) => l.userId === userId);
    if (mine) {
      my = { momentIds: mine.momentIds, captainMomentId: mine.captainMomentId, score: mine.score, won: mine.won, submitted: true };
    }
    if (day.run.survivor) {
      const lost = await db.fastBreakLineup.findFirst({ where: { userId, won: false, day: { runId: day.runId, closedAt: { not: null } } } });
      eliminated = !!lost;
    }
    // elegíveis: Moments possuídos agrupados por jogador, com usos restantes no run
    const moments = await db.moment.findMany({
      where: { ownerId: userId, burned: false },
      include: { template: { include: { player: true } } },
    });
    const usage = await db.momentUsage.findMany({ where: { runId: day.runId, userId } });
    const usedBy = new Map(usage.map((u) => [u.playerId, u.used]));
    const byPlayer = new Map<string, typeof moments>();
    for (const m of moments) {
      if (isMomentLocked(m)) continue;
      const list = byPlayer.get(m.template.playerId) ?? [];
      list.push(m);
      byPlayer.set(m.template.playerId, list);
    }
    eligible = [...byPlayer.entries()].map(([playerId, ms]) => {
      // o sistema prioriza o Moment com mais usos disponíveis (regra 15)
      const maxUses = Math.max(...ms.map((m) => usesForAsp(m.template.aspCents)));
      return {
        playerId,
        playerName: ms[0].template.player.name,
        moments: ms
          .map((m) => ({ id: m.id, serial: m.serial, tier: m.template.tier as string, maxUses: usesForAsp(m.template.aspCents) }))
          .sort((a, b) => b.maxUses - a.maxUses),
        used: usedBy.get(playerId) ?? 0,
        maxUses,
      };
    });
  }

  return {
    id: day.id,
    runId: day.runId,
    runName: day.run.name,
    survivor: day.run.survivor,
    lineupSize: day.run.lineupSize,
    dayNumber: day.dayNumber,
    gameDate: day.gameDate.toISOString(),
    statKey: stat,
    targetScore: day.targetScore,
    closed: !!day.closedAt,
    eliminated,
    my,
    eligible,
    board: lineups.map((l, i) => ({
      rank: i + 1,
      username: l.user.username,
      score: day.closedAt ? l.score : null,
      won: day.closedAt ? l.won : null,
    })),
  };
}

// ------------------------------------------------------------------ escalar

/** Escala lineupSize Moments de jogadores DISTINTOS; captain opcional; consome fadiga. */
export async function submitLineup(db: PrismaClient, userId: string, dayId: string, momentIds: string[], captainMomentId?: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const day = await tx.fastBreakDay.findUnique({ where: { id: dayId }, include: { run: true } });
      if (!day) throw notFound('Rodada não encontrada');
      if (day.closedAt) throw badRequest('Rodada já foi fechada');
      if (await tx.fastBreakLineup.findUnique({ where: { dayId_userId: { dayId, userId } } })) {
        throw badRequest('Você já escalou nesta rodada');
      }
      if (day.run.survivor) {
        const lost = await tx.fastBreakLineup.findFirst({ where: { userId, won: false, day: { runId: day.runId, closedAt: { not: null } } } });
        if (lost) throw badRequest('Você foi eliminado deste mata-mata');
      }
      if (momentIds.length !== day.run.lineupSize) throw badRequest(`Escale exatamente ${day.run.lineupSize} Lances`);
      if (captainMomentId && !momentIds.includes(captainMomentId)) throw badRequest('O captain precisa estar na escalação');

      const moments = await tx.moment.findMany({
        where: { id: { in: momentIds }, ownerId: userId, burned: false },
        include: { template: true },
      });
      if (moments.length !== momentIds.length) throw badRequest('Lances inválidos ou não são seus');
      for (const m of moments) if (isMomentLocked(m)) throw badRequest('Lance travado não pode ser escalado');

      const playerIds = moments.map((m) => m.template.playerId);
      if (new Set(playerIds).size !== playerIds.length) throw badRequest('Escale jogadores distintos');

      // fadiga: used < maxUses por jogador (maior ASP entre os Moments possuídos do jogador)
      for (const m of moments) {
        const pid = m.template.playerId;
        const best = await tx.moment.findMany({
          where: { ownerId: userId, burned: false, template: { playerId: pid } },
          include: { template: { select: { aspCents: true } } },
        });
        const maxUses = Math.max(...best.map((b) => usesForAsp(b.template.aspCents)));
        const usage = await tx.momentUsage.findUnique({ where: { runId_userId_playerId: { runId: day.runId, userId, playerId: pid } } });
        if ((usage?.used ?? 0) >= maxUses) throw badRequest(`${pid === m.template.playerId ? 'Jogador' : ''} sem usos restantes neste run (fadiga)`);
        await tx.momentUsage.upsert({
          where: { runId_userId_playerId: { runId: day.runId, userId, playerId: pid } },
          create: { runId: day.runId, userId, playerId: pid, used: 1 },
          update: { used: { increment: 1 } },
        });
      }

      await tx.fastBreakLineup.create({ data: { dayId, userId, momentIds, captainMomentId: captainMomentId ?? null } });
      return { submitted: true };
    }),
  );
}

// ------------------------------------------------------------------ fechar o dia (admin/cron)

/** Fecha a rodada: calcula score (stats simuladas; captain 2×) vs targetScore → won; marcos e survivor. */
export async function closeDay(db: PrismaClient, dayId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const day = await tx.fastBreakDay.findUnique({ where: { id: dayId }, include: { run: true } });
      if (!day) throw notFound('Rodada não encontrada');
      if (day.closedAt) throw badRequest('Rodada já foi fechada');
      const stat = normalizeStat(day.statKey);

      const lineups = await tx.fastBreakLineup.findMany({ where: { dayId } });
      const results: { userId: string; score: number; won: boolean }[] = [];
      let milestones = 0;

      for (const lu of lineups) {
        const moments = await tx.moment.findMany({ where: { id: { in: lu.momentIds } }, include: { template: true } });
        let score = 0;
        for (const m of moments) {
          const box = simulatePlayerDay(day.gameDate, m.template.playerId);
          const value = statOf(box, stat) * (m.id === lu.captainMomentId ? CAPTAIN_MULTIPLIER : 1);
          score += value;
        }
        score = Math.round(score);
        const won = score >= day.targetScore;
        await tx.fastBreakLineup.update({ where: { id: lu.id }, data: { score, won } });
        results.push({ userId: lu.userId, score, won });

        // marco de vitórias no run → pacote (uma vez, exatamente ao cruzar o marco)
        if (won && day.run.rewardPackId) {
          const wins = await tx.fastBreakLineup.count({
            where: { userId: lu.userId, won: true, day: { runId: day.runId, closedAt: { not: null } } },
          });
          if (wins + 1 === MILESTONE_WINS) {
            await tx.packInventory.create({ data: { packId: day.run.rewardPackId, ownerId: lu.userId } });
            milestones++;
          }
        }
      }

      await tx.fastBreakDay.update({ where: { id: dayId }, data: { closedAt: new Date() } });
      return { closed: true, lineups: results.length, milestonesGranted: milestones };
    }),
  );
}

// ------------------------------------------------------------------ ranking do run

export async function runLeaderboard(db: PrismaClient, runId: string) {
  const run = await db.fastBreakRun.findUnique({ where: { id: runId } });
  if (!run) throw notFound('Run não encontrado');
  const lineups = await db.fastBreakLineup.findMany({
    where: { day: { runId, closedAt: { not: null } } },
    include: { user: { select: { username: true } } },
  });
  const byUser = new Map<string, { username: string; wins: number; totalScore: number; days: number; eliminated: boolean }>();
  for (const l of lineups) {
    const e = byUser.get(l.userId) ?? { username: l.user.username, wins: 0, totalScore: 0, days: 0, eliminated: false };
    e.wins += l.won ? 1 : 0;
    e.totalScore += l.score;
    e.days += 1;
    if (run.survivor && !l.won) e.eliminated = true;
    byUser.set(l.userId, e);
  }
  return {
    id: run.id,
    name: run.name,
    survivor: run.survivor,
    standings: [...byUser.values()].sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore).map((e, i) => ({ rank: i + 1, ...e })),
  };
}
