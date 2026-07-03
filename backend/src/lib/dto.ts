import type {
  Listing,
  Moment,
  Offer,
  Pack,
  PackInventory,
  Player,
  Showcase,
  ShowcaseItem,
  Team,
  Template,
  Transaction,
  User,
  WalletTransaction,
} from '@prisma/client';

type TxWithActors = Transaction & {
  buyer?: { username: string } | null;
  seller?: { username: string } | null;
};

type TemplateWithPlayer = Template & { player: Player };
type MomentWithTemplate = Moment & { template: TemplateWithPlayer; listing?: Listing | null };
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
    showInFeed: user.showInFeed,
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
    listingPriceCents: m.listing && m.listing.status === 'ACTIVE' ? m.listing.priceCents : null,
    template: toTemplateDTO(m.template),
  };
}

export function toListingDTO(l: Listing & { seller?: { username: string } | null }) {
  return {
    id: l.id,
    priceCents: l.priceCents,
    status: l.status,
    sellerUsername: l.seller?.username ?? null,
    createdAt: l.createdAt.toISOString(),
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

export function toTransactionDTO(tx: TxWithActors) {
  return {
    id: tx.id,
    type: tx.type,
    amountCents: tx.amountCents,
    feeCents: tx.feeCents,
    buyer: tx.buyer?.username ?? null,
    seller: tx.seller?.username ?? null,
    createdAt: tx.createdAt.toISOString(),
  };
}

export function toOfferDTO(
  o: Offer & {
    moment?: (Moment & { template: TemplateWithPlayer }) | null;
    template?: TemplateWithPlayer | null;
  },
) {
  const tpl = o.moment?.template ?? o.template ?? null;
  return {
    id: o.id,
    priceCents: o.priceCents,
    status: o.status,
    scope: o.momentId ? 'serial' : 'edition',
    momentId: o.momentId,
    serial: o.moment?.serial ?? null,
    createdAt: o.createdAt.toISOString(),
    expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
    template: tpl ? toTemplateDTO(tpl) : null,
  };
}

type ShowcaseItemFull = ShowcaseItem & { moment: MomentWithTemplate };

export function toShowcaseDTO(
  s: Showcase & { items?: ShowcaseItemFull[]; owner?: { username: string } | null; _count?: { items: number } },
) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    public: s.public,
    ownerUsername: s.owner?.username ?? null,
    itemCount: s._count?.items ?? s.items?.length ?? 0,
    items: s.items ? s.items.map((i) => ({ order: i.order, moment: toMomentDTO(i.moment) })) : undefined,
  };
}

export function toPublicUserDTO(user: User, favoriteTeam: Team | null, momentCount: number) {
  return {
    username: user.username,
    topShotScore: user.topShotScore,
    collectorScore: user.collectorScore,
    isAdmin: user.isAdmin,
    momentCount,
    favoriteTeam: favoriteTeam ? toTeamDTO(favoriteTeam) : null,
    createdAt: user.createdAt.toISOString(),
  };
}
