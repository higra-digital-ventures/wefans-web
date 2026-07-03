export type TeamDTO = { id: string; name: string; partnerStatus: string };

export type UserDTO = {
  id: string;
  email: string;
  username: string;
  balanceCents: number;
  topShotScore: number;
  collectorScore: number;
  tradeTickets: number;
  showInFeed: boolean;
  isAdmin: boolean;
  favoriteTeam: TeamDTO | null;
  createdAt: string;
};

export type WalletTx = {
  id: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  memo: string | null;
  createdAt: string;
};

export type Wallet = { balanceCents: number; transactions: WalletTx[] };

export type Tier = 'COMUM' | 'TORCIDA' | 'RARO' | 'LENDARIO' | 'GALACTICO';
export type EditionType = 'CIRCULANTE' | 'LIMITADA';

export type PlayerDTO = {
  id: string;
  name: string;
  club: string;
  position: string;
  jersey: number;
  nationality: string;
};

export type TemplateDTO = {
  id: string;
  title: string;
  playType: string;
  competition: string;
  matchDate: string;
  tier: Tier;
  editionType: EditionType;
  editionSize: number | null;
  mintedCount: number;
  circulatingCount: number;
  parallel: string;
  badges: string[];
  trajectory: string | null;
  aspCents: number;
  setId: string | null;
  seriesId: string;
  teamId: string | null;
  player: PlayerDTO;
  counts?: { existing: number; circulating: number; burned: number; listed: number };
};

export type ProvenanceTx = {
  id: string;
  type: string;
  amountCents: number;
  feeCents: number;
  buyer: string | null;
  seller: string | null;
  createdAt: string;
};

export type MomentDTO = {
  id: string;
  serial: number;
  parallel: string;
  topShotScore: number;
  locked: boolean;
  lockedUntil: string | null;
  burned: boolean;
  acquiredPriceCents: number;
  mintedAt: string;
  template: TemplateDTO;
  ownerUsername?: string | null;
  provenance?: ProvenanceTx[];
  listingPriceCents?: number | null;
  listing?: { id: string; priceCents: number } | null;
};

export type MarketListing = {
  listingId: string;
  priceCents: number;
  seller: string;
  createdAt: string;
  momentId: string;
  serial: number;
  template: TemplateDTO;
};

export type RecentSale = {
  id: string;
  priceCents: number;
  buyer: string | null;
  seller: string | null;
  createdAt: string;
  momentId: string;
  serial: number;
  flagged: boolean;
  template: TemplateDTO;
};

export type OfferForMoment = {
  id: string;
  priceCents: number;
  buyer: string;
  scope: string;
  createdAt: string;
  expiresAt: string | null;
};

export type MyOffer = {
  id: string;
  priceCents: number;
  status: string;
  scope: string;
  momentId: string | null;
  serial: number | null;
  createdAt: string;
  expiresAt: string | null;
  template: TemplateDTO | null;
};

export type ChallengeSummary = {
  id: string;
  type: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  burnOnComplete: boolean;
  completed: boolean;
  progress: { have: number; need: number } | null;
};

export type ChallengeDetail = {
  id: string;
  type: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  burnOnComplete: boolean;
  completed: boolean;
  required: { template: TemplateDTO; eligible: { id: string; serial: number }[] }[];
  rewardTemplate: TemplateDTO | null;
  hasPackReward: boolean;
  flash: {
    stat: string;
    min: number;
    scorersToday: string[];
    myScorers: string[];
    eligible: boolean;
  } | null;
};

export type LeaderboardSummary = {
  id: string;
  kind: string;
  refKey: string;
  name: string;
  snapshotAt: string | null;
  rewards: unknown;
  top: { username: string; points: number; rank: number | null }[];
  myPoints: number | null;
  myRank: number | null;
};

export type LeaderboardDetail = {
  id: string;
  kind: string;
  refKey: string;
  name: string;
  snapshotAt: string | null;
  rewards: unknown;
  entries: { username: string; points: number; rank: number }[];
  eligibleMoments: { id: string; serial: number; playerName: string; points: number }[];
};

export type ChecklistDTO = {
  id: string;
  name: string;
  kind: string;
  bonusPoints: number;
  progress: { have: number; need: number } | null;
  claimed: boolean;
};

export type DropMyEntry = {
  position: number | null;
  windowStartsAt: string | null;
  purchased: boolean;
  canBuyNow: boolean;
  canRebound: boolean;
};

export type DropSummary = {
  id: string;
  name: string;
  status: string;
  waitingRoomOpensAt: string;
  startsAt: string;
  endsAt: string;
  requiredCollectorScore: number;
  hasRebound: boolean;
  packs: PackDTO[];
};

export type DropDetail = DropSummary & {
  eligible: boolean;
  collectorScore: number;
  myEntry: DropMyEntry | null;
};

export type PackListingDTO = {
  id: string;
  priceCents: number;
  seller: string;
  packInventoryId: string;
  createdAt: string;
  pack: PackDTO;
};

export type MyPack = {
  id: string;
  pack: PackDTO;
  listed: boolean;
  listingId: string | null;
  priceCents: number | null;
};

export type ShowcaseSummary = {
  id: string;
  name: string;
  description: string;
  public: boolean;
  ownerUsername: string | null;
  itemCount: number;
};

export type ShowcaseDetail = ShowcaseSummary & {
  items: { order: number; moment: MomentDTO }[];
  isOwner: boolean;
};

export type QuestDTO = {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  claimed: boolean;
  eligible: boolean;
  criteria: unknown;
};

export type TicketPack = PackDTO & { ticketCost: number };

export type FastBreakRunDTO = {
  id: string;
  name: string;
  survivor: boolean;
  lineupSize: number;
  startsAt: string;
  endsAt: string;
  myWins: number;
  eliminated: boolean;
  days: { id: string; dayNumber: number; gameDate: string; statKey: string; targetScore: number; closed: boolean }[];
};

export type FastBreakDayDetail = {
  id: string;
  runId: string;
  runName: string;
  survivor: boolean;
  lineupSize: number;
  dayNumber: number;
  gameDate: string;
  statKey: string;
  targetScore: number;
  closed: boolean;
  eliminated: boolean;
  my: { momentIds: string[]; captainMomentId: string | null; score: number; won: boolean; submitted: boolean } | null;
  eligible: {
    playerId: string;
    playerName: string;
    moments: { id: string; serial: number; tier: string; maxUses: number }[];
    used: number;
    maxUses: number;
  }[];
  board: { rank: number; username: string; score: number | null; won: boolean | null }[];
};

export type FastBreakStandings = {
  id: string;
  name: string;
  survivor: boolean;
  standings: { rank: number; username: string; wins: number; totalScore: number; days: number; eliminated: boolean }[];
};

// ----- admin (Fase 10) -----
export type AdminMetrics = {
  users: number;
  moments: { total: number; burned: number };
  market: { activeListings: number; sales: number; volumeCents: number; feesCents: number; flaggedTx: number };
  checkins: Record<string, number>;
  reviewPending: number;
  templates: Record<string, number>;
};

export type AdminTeam = {
  id: string;
  name: string;
  partnerStatus: string;
  status: string;
  publishAt: string | null;
  stadium: { id: string; name: string; city: string } | null;
  templateCount: number;
};

export type AdminTemplate = {
  id: string;
  title: string;
  player: string;
  team: string | null;
  tier: string;
  editionType: string;
  editionSize: number | null;
  mintedCount: number;
  status: string;
  publishAt: string | null;
};

export type AdminFixture = {
  id: string;
  home: string;
  away: string;
  stadium: string;
  kickoffAt: string;
  status: string;
  checkins: number;
};

export type FraudCheckin = {
  id: string;
  username: string;
  reason: string | null;
  lat: number;
  lng: number;
  accuracyM: number;
  createdAt: string;
  fixture: { home: string; away: string; stadium: string };
};

export type AuditEntry = {
  id: string;
  by: string;
  action: string;
  target: string | null;
  meta: unknown;
  createdAt: string;
};

export type ActiveFixture = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stadium: { name: string; city: string; lat: number; lng: number; radiusMeters: number };
  kickoffAt: string;
  checkinClosesAt: string;
  rewardPackName: string;
  checkinStatus: string | null;
};

export type CheckinHistoryItem = {
  id: string;
  status: string;
  reason: string | null;
  grantedPackInventoryId: string | null;
  createdAt: string;
  fixture: { home: string; away: string; stadium: string };
};

export type TemplateMarket = {
  aspCents: number;
  floorCents: number | null;
  floorListingId: string | null;
  floorMomentId: string | null;
  activeListings: number;
  lockedCount: number;
  recentSales: { amountCents: number; createdAt: string; buyer: string | null; serial: number }[];
};

export type ProfileStats = {
  momentCount: number;
  tierCounts: Record<string, number>;
  openedPacks: { id: string; packName: string; createdAt: string }[];
  percentile?: { score: number; collector: number };
};

export type PublicProfile = {
  username: string;
  topShotScore: number;
  collectorScore: number;
  isAdmin: boolean;
  momentCount: number;
  favoriteTeam: TeamDTO | null;
  createdAt: string;
};

export type PackDTO = {
  id: string;
  name: string;
  priceCents: number;
  momentCount: number;
  oddsJson: Record<string, number>;
  guaranteeTier: Tier | null;
  totalSupply: number;
  soldCount: number;
  ticketOnly: boolean;
  dropId: string | null;
};

export type PackInventoryDTO = { id: string; opened: boolean; createdAt: string; pack: PackDTO };

// ----- Feed do Explorar (rede de eventos, gramática do Explore do Top Shot) -----
export type FeedEvent = {
  id: string;
  kind: 'SALE' | 'LIST' | 'PACK_OPEN' | 'GIFT' | 'BURN' | 'CHALLENGE' | 'QUEST' | 'CHECKIN';
  user: string | null;
  targetUser?: string | null;
  createdAt: string;
  priceCents?: number;
  count?: number;
  momentId?: string;
  serial?: number;
  template?: TemplateDTO;
  label?: string;
};

export type FeedPopular = {
  players: { name: string; count: number }[];
  competitions: { name: string; count: number }[];
};

export type TemplateCollectors = {
  topCollectors: { username: string; count: number }[];
  specialSerials: { serial: number; label: string; owner: string | null; burned: boolean; momentId: string }[];
};

export type NotificationDTO = {
  id: string;
  kind: 'SALE' | 'GIFT' | 'OFFER' | 'CHECKIN' | 'DROP_WINDOW' | 'MATCHDAY' | 'WISHLIST';
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

// ----- Chat 1:1 (negociação) -----
export type ChatSummary = {
  username: string;
  lastBody: string;
  lastAt: string;
  lastMine: boolean;
  unread: number;
};

export type ChatMessageDTO = {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
};
