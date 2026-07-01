import type { Team, User, WalletTransaction } from '@prisma/client';

// Nunca exponha modelos Prisma crus (seção A1). DTOs versionados e estáveis.

export function toUserDTO(user: User, favoriteTeam?: Team | null) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    balanceCents: user.balanceCents,
    topShotScore: user.topShotScore,
    collectorScore: user.collectorScore,
    tradeTickets: user.tradeTickets,
    isAdmin: user.isAdmin,
    favoriteTeam: favoriteTeam ? toTeamDTO(favoriteTeam) : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toTeamDTO(team: Team) {
  return { id: team.id, name: team.name, partnerStatus: team.partnerStatus };
}

export function toWalletTxDTO(tx: WalletTransaction) {
  return {
    id: tx.id,
    type: tx.type,
    amountCents: tx.amountCents,
    balanceAfterCents: tx.balanceAfterCents,
    memo: tx.memo,
    createdAt: tx.createdAt.toISOString(),
  };
}
