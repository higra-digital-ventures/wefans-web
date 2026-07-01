import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { isMomentLocked } from '../lib/moment';
import { toTemplateDTO } from '../lib/dto';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';

/** Desafios STANDARD/CRAFTING com progresso do usuário (Challenge Hub, seção 11.9). */
export async function listChallenges(db: PrismaClient, userId?: string) {
  const challenges = await db.challenge.findMany({
    where: { type: { in: ['STANDARD', 'CRAFTING'] } },
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
  };
}

/**
 * Montador de Entrada (Builder): submete Moments que cobrem os Lances exigidos.
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

      const moments = await tx.moment.findMany({ where: { id: { in: momentIds }, ownerId: userId, burned: false } });
      if (moments.length !== momentIds.length) throw badRequest('Momentos inválidos ou não são seus');
      for (const m of moments) if (isMomentLocked(m)) throw badRequest('Momento travado não pode ser usado');
      const provided = new Set(moments.map((m) => m.templateId));
      for (const reqId of c.requiredTemplateIds) if (!provided.has(reqId)) throw badRequest('Faltam Lances exigidos');

      if (c.burnOnComplete) {
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
