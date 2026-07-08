import type { Prisma, PrismaClient } from '@prisma/client';

type Db = Prisma.TransactionClient | PrismaClient;

// Split de receita (parceria/licenciamento). Esquema "Padrão":
// - Revenda: 5% plataforma + 5% clube (vendedor 90%). Sem clube parceiro, os
//   5% do clube ficam com a plataforma (incentiva o time a assinar).
// - Pack (primário): 30% do valor vai para os clubes dos Momentos revelados.
// Só times com vínculo (template.teamId) faturam.
export const PLATFORM_FEE_BPS = 500; // 5%
export const CLUB_ROYALTY_BPS = 500; // 5% (revenda)
export const PRIMARY_CLUB_BPS = 3000; // 30% (pack primário)

/** Taxas efetivas: lê o singleton PlatformConfig (editável pelo admin); cai nos
 * defaults acima se ainda não houver linha. */
export async function getRoyaltyConfig(db: Db) {
  const cfg = await db.platformConfig.findUnique({ where: { id: 'singleton' } });
  return {
    platformFeeBps: cfg?.platformFeeBps ?? PLATFORM_FEE_BPS,
    clubRoyaltyBps: cfg?.clubRoyaltyBps ?? CLUB_ROYALTY_BPS,
    primaryClubBps: cfg?.primaryClubBps ?? PRIMARY_CLUB_BPS,
  };
}

/** Credita a parte do clube: soma no acumulado + grava a entrada no extrato. */
export async function creditTeam(
  tx: Prisma.TransactionClient,
  teamId: string,
  amountCents: number,
  kind: 'PRIMARY' | 'ROYALTY',
  momentId?: string | null,
  memo?: string,
) {
  if (amountCents <= 0) return;
  await tx.team.update({ where: { id: teamId }, data: { earningsCents: { increment: amountCents } } });
  await tx.teamEarning.create({
    data: { teamId, amountCents, kind, momentId: momentId ?? null, memo: memo ?? null },
  });
}
