import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { isMomentLocked } from '../lib/moment';
import { simulateDay } from '../lib/matchSim';
import { toTemplateDTO } from '../lib/dto';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Avalia o critério FLASH contra as stats simuladas de hoje (seção 8).
 * flashRuleJson: { rule: 'own_moment_of_scorer', stat?: 'gols', min?: 1 }.
 * Retorna os jogadores que cumprem a stat hoje e quais deles o usuário possui.
 */
async function evaluateFlash(db: Db, userId: string | undefined, rule: Prisma.JsonValue) {
  const r = (rule ?? {}) as { stat?: 'gols' | 'assistencias' | 'defesas' | 'desarmes'; min?: number };
  const stat = r.stat ?? 'gols';
  const min = r.min ?? 1;
  const players = await db.player.findMany({ select: { id: true, name: true } });
  const box = simulateDay(new Date(), players.map((p) => p.id));
  const nameById = new Map(players.map((p) => [p.id, p.name]));
  const qualifying = box.filter((b) => b[stat] >= min).map((b) => b.playerId);
  const qualifyingSet = new Set(qualifying);

  let myQualifying: string[] = [];
  if (userId) {
    const owned = await db.moment.findMany({
      where: { ownerId: userId, burned: false, template: { playerId: { in: qualifying } } },
      select: { template: { select: { playerId: true } } },
      distinct: ['templateId'],
    });
    myQualifying = [...new Set(owned.map((o) => o.template.playerId))];
  }
  return {
    stat,
    min,
    scorersToday: qualifying.map((id) => nameById.get(id) ?? id),
    myScorers: myQualifying.map((id) => nameById.get(id) ?? id),
    eligible: myQualifying.length > 0,
    qualifyingSet,
  };
}

/** Desafios (STANDARD/CRAFTING/FLASH) com progresso do usuário (Challenge Hub, seção 11.9). */
export async function listChallenges(db: PrismaClient, userId?: string) {
  const challenges = await db.challenge.findMany({
    orderBy: { endsAt: 'asc' },
  });
  const now = new Date();
  const out = [];
  for (const c of challenges) {
    let progress: { have: number; need: number } | null = null;
    let completed = false;
    if (userId) {
      const entry = await db.challengeEntry.findFirst({ where: { challengeId: c.id, userId, completedAt: { not: null } } });
      completed = !!entry;
      if (c.requiredTemplateIds.length) {
        const owned = await db.moment.findMany({
          where: { ownerId: userId, burned: false, templateId: { in: c.requiredTemplateIds } },
          select: { templateId: true },
          distinct: ['templateId'],
        });
        const set = new Set(owned.map((o) => o.templateId));
        progress = { have: c.requiredTemplateIds.filter((id) => set.has(id)).length, need: c.requiredTemplateIds.length };
      }
    }
    out.push({
      id: c.id,
      type: c.type,
      name: c.name,
      description: c.description,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      active: c.startsAt <= now && c.endsAt >= now,
      burnOnComplete: c.burnOnComplete,
      completed,
      progress,
      requiredTemplateIds: c.requiredTemplateIds,
    });
  }
  return out;
}

export async function getChallenge(db: PrismaClient, id: string, userId?: string) {
  const c = await db.challenge.findUnique({ where: { id } });
  if (!c) throw notFound('Desafio não encontrado');
  const required = await db.template.findMany({ where: { id: { in: c.requiredTemplateIds } }, include: { player: true } });

  const eligibleByTemplate: Record<string, { id: string; serial: number }[]> = {};
  let completed = false;
  if (userId) {
    const owned = await db.moment.findMany({
      where: { ownerId: userId, burned: false, templateId: { in: c.requiredTemplateIds } },
    });
    for (const m of owned) {
      if (isMomentLocked(m)) continue;
      (eligibleByTemplate[m.templateId] ??= []).push({ id: m.id, serial: m.serial });
    }
    completed = !!(await db.challengeEntry.findFirst({ where: { challengeId: id, userId, completedAt: { not: null } } }));
  }

  const rewardTemplate = c.rewardTemplateId
    ? await db.template.findUnique({ where: { id: c.rewardTemplateId }, include: { player: true } })
    : null;

  // FLASH: avalia o critério contra as stats simuladas de hoje.
  let flash: { stat: string; min: number; scorersToday: string[]; myScorers: string[]; eligible: boolean } | null = null;
  if (c.type === 'FLASH') {
    const f = await evaluateFlash(db, userId, c.flashRuleJson);
    flash = { stat: f.stat, min: f.min, scorersToday: f.scorersToday, myScorers: f.myScorers, eligible: f.eligible };
  }

  return {
    id: c.id,
    type: c.type,
    name: c.name,
    description: c.description,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    burnOnComplete: c.burnOnComplete,
    completed,
    required: required.map((t) => ({ template: toTemplateDTO(t), eligible: eligibleByTemplate[t.id] ?? [] })),
    rewardTemplate: rewardTemplate ? toTemplateDTO(rewardTemplate) : null,
    hasPackReward: !!c.rewardPackId,
    flash,
  };
}

/**
 * Montador de Entrada (Builder): submete Moments que cobrem os Momentos exigidos.
 * STANDARD só verifica posse; CRAFTING **queima** a entrada. Concede a recompensa. Atômico.
 */
export async function submitChallenge(db: PrismaClient, userId: string, challengeId: string, momentIds: string[]) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const c = await tx.challenge.findUnique({ where: { id: challengeId } });
      if (!c) throw notFound('Desafio não encontrado');
      const now = new Date();
      if (c.startsAt > now || c.endsAt < now) throw badRequest('Desafio fora do período');
      const existing = await tx.challengeEntry.findFirst({ where: { challengeId, userId, completedAt: { not: null } } });
      if (existing) throw badRequest('Desafio já concluído');

      let moments: { id: string; templateId: string }[] = [];
      if (c.type === 'FLASH') {
        // Critério ao vivo (stats simuladas de hoje) — sem submissão de Moments.
        const f = await evaluateFlash(tx, userId, c.flashRuleJson);
        if (!f.eligible) throw badRequest('Critério do desafio relâmpago não cumprido hoje');
      } else {
        const found = await tx.moment.findMany({ where: { id: { in: momentIds }, ownerId: userId, burned: false } });
        if (found.length !== momentIds.length || momentIds.length === 0) throw badRequest('Momentos inválidos ou não são seus');
        for (const m of found) if (isMomentLocked(m)) throw badRequest('Momento travado não pode ser usado');
        const provided = new Set(found.map((m) => m.templateId));
        for (const reqId of c.requiredTemplateIds) if (!provided.has(reqId)) throw badRequest('Faltam Momentos exigidos');
        moments = found;
      }

      if (c.type !== 'FLASH' && c.burnOnComplete) {
        for (const m of moments) {
          await tx.moment.update({ where: { id: m.id }, data: { burned: true, ownerId: null } });
          await tx.template.update({ where: { id: m.templateId }, data: { circulatingCount: { decrement: 1 } } });
          await tx.transaction.create({ data: { type: 'BURN', momentId: m.id, sellerId: userId, amountCents: 0 } });
        }
      }

      let grant: { rewardMomentId?: string; grantedPackInventoryId?: string } = {};
      if (c.rewardTemplateId) {
        const rows = await tx.$queryRaw<Array<{ mintedCount: number }>>(Prisma.sql`
          UPDATE "Template" SET "mintedCount" = "mintedCount" + 1, "circulatingCount" = "circulatingCount" + 1
          WHERE "id" = ${c.rewardTemplateId} AND ("editionSize" IS NULL OR "mintedCount" < "editionSize")
          RETURNING "mintedCount"
        `);
        if (rows.length === 0) throw badRequest('Recompensa esgotada');
        const tpl = await tx.template.findUnique({ where: { id: c.rewardTemplateId }, select: { parallel: true, aspCents: true } });
        const score = Math.round(((tpl?.aspCents ?? 0) / 100) * 10);
        const moment = await tx.moment.create({
          data: { templateId: c.rewardTemplateId, serial: Number(rows[0].mintedCount), ownerId: userId, parallel: tpl?.parallel ?? 'BASE', acquiredPriceCents: tpl?.aspCents ?? 0, topShotScore: score },
        });
        await tx.transaction.create({ data: { type: 'REWARD', momentId: moment.id, buyerId: userId, amountCents: 0 } });
        grant = { rewardMomentId: moment.id };
      } else if (c.rewardPackId) {
        const inv = await tx.packInventory.create({ data: { packId: c.rewardPackId, ownerId: userId } });
        grant = { grantedPackInventoryId: inv.id };
      }

      await tx.challengeEntry.create({ data: { challengeId, userId, momentIds, completedAt: now } });
      await recomputeUserScores(tx, userId);
      return { status: 'COMPLETED' as const, ...grant };
    }),
  );
}
