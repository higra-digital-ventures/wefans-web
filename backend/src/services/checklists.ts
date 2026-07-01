import type { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';

export async function listChecklists(db: PrismaClient, userId?: string) {
  const checklists = await db.checklist.findMany({ orderBy: { name: 'asc' } });
  const out = [];
  for (const c of checklists) {
    let progress: { have: number; need: number } | null = null;
    let claimed = false;
    if (userId) {
      const owned = await db.moment.findMany({
        where: { ownerId: userId, burned: false, templateId: { in: c.requiredTemplateIds } },
        select: { templateId: true },
        distinct: ['templateId'],
      });
      const set = new Set(owned.map((o) => o.templateId));
      progress = { have: c.requiredTemplateIds.filter((id) => set.has(id)).length, need: c.requiredTemplateIds.length };
      claimed = !!(await db.checklistClaim.findUnique({ where: { checklistId_userId: { checklistId: c.id, userId } } }));
    }
    out.push({ id: c.id, name: c.name, kind: c.kind, bonusPoints: c.bonusPoints, progress, claimed });
  }
  return out;
}

/**
 * Resgata o bônus de um checklist completo (regra 12): soma bonusPoints ao score do
 * time (entry no leaderboard TEAM) e entra no Score do Colecionador via recompute.
 */
export async function claimChecklist(db: PrismaClient, userId: string, checklistId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const c = await tx.checklist.findUnique({ where: { id: checklistId } });
      if (!c) throw notFound('Checklist não encontrado');
      if (await tx.checklistClaim.findUnique({ where: { checklistId_userId: { checklistId, userId } } })) {
        throw badRequest('Bônus já resgatado');
      }
      const owned = await tx.moment.findMany({
        where: { ownerId: userId, burned: false, templateId: { in: c.requiredTemplateIds } },
        select: { templateId: true },
        distinct: ['templateId'],
      });
      if (new Set(owned.map((o) => o.templateId)).size < c.requiredTemplateIds.length) {
        throw badRequest('Checklist ainda não está completo');
      }

      await tx.checklistClaim.create({ data: { checklistId, userId } });

      // bônus no score do time: entry no leaderboard TEAM correspondente (ou o primeiro).
      const board =
        (await tx.leaderboard.findFirst({ where: { kind: 'TEAM', refKey: c.kind } })) ??
        (await tx.leaderboard.findFirst({ where: { kind: 'TEAM' } }));
      if (board && !board.snapshotAt) {
        const existing = await tx.leaderboardEntry.findFirst({ where: { leaderboardId: board.id, userId } });
        if (existing) await tx.leaderboardEntry.update({ where: { id: existing.id }, data: { points: { increment: c.bonusPoints } } });
        else await tx.leaderboardEntry.create({ data: { leaderboardId: board.id, userId, points: c.bonusPoints } });
      }

      await recomputeUserScores(tx, userId);
      return { claimed: true, bonusPoints: c.bonusPoints };
    }),
  );
}
