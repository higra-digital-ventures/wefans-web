import type { Prisma, Tier } from '@prisma/client';

// Pontos fixos por tier para o Score do Colecionador (regra 4). Afináveis.
const TIER_POINTS: Record<Tier, number> = {
  COMUM: 18,
  TORCIDA: 45,
  RARO: 120,
  LENDARIO: 1500,
  GALACTICO: 5000,
};
const CHALLENGE_BONUS = 500; // bônus por desafio concluído

/**
 * Recalcula os dois scores do usuário a partir dos Moments possuídos:
 * - Pontuação wefans (topShotScore) = soma dos scores dos Moments.
 * - Score do Colecionador (collectorScore) = pontos por tier + bônus de desafios.
 * Chamar em toda mudança de posse (mint, compra, venda, presente, queima, recompensa).
 */
export async function recomputeUserScores(tx: Prisma.TransactionClient, userId: string) {
  const moments = await tx.moment.findMany({
    where: { ownerId: userId, burned: false },
    select: { topShotScore: true, template: { select: { tier: true } } },
  });
  const topShotScore = moments.reduce((s, m) => s + m.topShotScore, 0);
  let collectorScore = moments.reduce((s, m) => s + TIER_POINTS[m.template.tier], 0);
  const completedChallenges = await tx.challengeEntry.count({ where: { userId, completedAt: { not: null } } });
  collectorScore += completedChallenges * CHALLENGE_BONUS;
  // bônus de checklists resgatados (regra 4/12)
  const claims = await tx.checklistClaim.findMany({ where: { userId }, select: { checklistId: true } });
  if (claims.length) {
    const checklists = await tx.checklist.findMany({
      where: { id: { in: claims.map((c) => c.checklistId) } },
      select: { bonusPoints: true },
    });
    collectorScore += checklists.reduce((s, c) => s + c.bonusPoints, 0);
  }
  await tx.user.update({ where: { id: userId }, data: { topShotScore, collectorScore } });
}
