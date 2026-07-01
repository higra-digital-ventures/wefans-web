import type {
  Moment,
  Pack,
  PackInventory,
  Player,
  Team,
  Template,
  User,
  WalletTransaction,
} from '@prisma/client';

type TemplateWithPlayer = Template & { player: Player };
type MomentWithTemplate = Moment & { template: TemplateWithPlayer };
type PackInventoryWithPack = PackInventory & { pack: Pack };

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

export function toTemplateDTO(t: TemplateWithPlayer) {
  return {
    id: t.id,
    title: t.title,
    playType: t.playType,
    competition: t.competition,
    matchDate: t.matchDate.toISOString(),
    tier: t.tier,
    editionType: t.editionType,
    editionSize: t.editionSize,
    mintedCount: t.mintedCount,
    circulatingCount: t.circulatingCount,
    parallel: t.parallel,
    badges: t.badges,
    trajectory: t.trajectory,
    aspCents: t.aspCents,
    setId: t.setId,
    seriesId: t.seriesId,
    teamId: t.teamId,
    player: {
      id: t.player.id,
      name: t.player.name,
      club: t.player.club,
      position: t.player.position,
      jersey: t.player.jersey,
      nationality: t.player.nationality,
    },
  };
}

export function toTemplateDetailDTO(
  t: TemplateWithPlayer,
  counts: { existing: number; circulating: number; burned: number; listed: number },
) {
  return { ...toTemplateDTO(t), counts };
}

export function toMomentDTO(m: MomentWithTemplate) {
  return {
    id: m.id,
    serial: m.serial,
    parallel: m.parallel,
    topShotScore: m.topShotScore,
    locked: m.locked,
    lockedUntil: m.lockedUntil ? m.lockedUntil.toISOString() : null,
    burned: m.burned,
    acquiredPriceCents: m.acquiredPriceCents,
    mintedAt: m.mintedAt.toISOString(),
    template: toTemplateDTO(m.template),
  };
}

export function toPackDTO(p: Pack) {
  return {
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    momentCount: p.momentCount,
    oddsJson: p.oddsJson,
    guaranteeTier: p.guaranteeTier,
    totalSupply: p.totalSupply,
    soldCount: p.soldCount,
    ticketOnly: p.ticketOnly,
    dropId: p.dropId,
  };
}

export function toPackInventoryDTO(inv: PackInventoryWithPack) {
  return {
    id: inv.id,
    opened: inv.opened,
    createdAt: inv.createdAt.toISOString(),
    pack: toPackDTO(inv.pack),
  };
}
