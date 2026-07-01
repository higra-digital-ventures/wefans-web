import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';

type Db = PrismaClient | Prisma.TransactionClient;

/** Avalia o critério de uma missão (regra 11). Extensível por `type`. */
async function evaluateCriteria(db: Db, userId: string, criteria: Prisma.JsonValue): Promise<boolean> {
  const c = (criteria ?? {}) as { type?: string; count?: number };
  if (c.type === 'showcase_competitions') {
    const need = c.count ?? 3;
    const showcases = await db.showcase.findMany({
      where: { ownerId: userId },
      include: { items: { include: { moment: { include: { template: { select: { competition: true } } } } } } },
    });
    return showcases.some((s) => new Set(s.items.map((i) => i.moment.template.competition)).size >= need);
  }
  return false;
}

export async function listQuests(db: PrismaClient, userId?: string) {
  const quests = await db.quest.findMany({ orderBy: { endsAt: 'asc' } });
  const now = new Date();
  const out = [];
  for (const q of quests) {
    let claimed = false;
    let eligible = false;
    if (userId) {
      claimed = !!(await db.questClaim.findUnique({ where: { questId_userId: { questId: q.id, userId } } }));
      eligible = claimed || (await evaluateCriteria(db, userId, q.criteriaJson));
    }
    out.push({
      id: q.id,
      name: q.name,
      description: q.description,
      startsAt: q.startsAt.toISOString(),
      endsAt: q.endsAt.toISOString(),
      active: q.startsAt <= now && q.endsAt >= now,
      criteria: q.criteriaJson,
      claimed,
      eligible,
    });
  }
  return out;
}

export async function claimQuest(db: PrismaClient, userId: string, questId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const q = await tx.quest.findUnique({ where: { id: questId } });
      if (!q) throw notFound('Missão não encontrada');
      const now = new Date();
      if (q.startsAt > now || q.endsAt < now) throw badRequest('Missão fora do período');
      if (await tx.questClaim.findUnique({ where: { questId_userId: { questId, userId } } })) {
        throw badRequest('Missão já resgatada');
      }
      if (!(await evaluateCriteria(tx, userId, q.criteriaJson))) throw badRequest('Critério ainda não cumprido');

      let grant: { rewardMomentId?: string } = {};
      if (q.rewardTemplateId) {
        const rows = await tx.$queryRaw<Array<{ mintedCount: number }>>(Prisma.sql`
          UPDATE "Template" SET "mintedCount" = "mintedCount" + 1, "circulatingCount" = "circulatingCount" + 1
          WHERE "id" = ${q.rewardTemplateId} AND ("editionSize" IS NULL OR "mintedCount" < "editionSize")
          RETURNING "mintedCount"
        `);
        if (rows.length === 0) throw badRequest('Recompensa esgotada');
        const tpl = await tx.template.findUnique({ where: { id: q.rewardTemplateId }, select: { parallel: true, aspCents: true } });
        const moment = await tx.moment.create({
          data: { templateId: q.rewardTemplateId, serial: Number(rows[0].mintedCount), ownerId: userId, parallel: tpl?.parallel ?? 'BASE', acquiredPriceCents: tpl?.aspCents ?? 0, topShotScore: Math.round(((tpl?.aspCents ?? 0) / 100) * 10) },
        });
        await tx.transaction.create({ data: { type: 'REWARD', momentId: moment.id, buyerId: userId, amountCents: 0 } });
        grant = { rewardMomentId: moment.id };
      }
      await tx.questClaim.create({ data: { questId, userId } });
      await recomputeUserScores(tx, userId);
      return { status: 'CLAIMED' as const, ...grant };
    }),
  );
}
