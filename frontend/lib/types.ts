export type TeamDTO = { id: string; name: string; partnerStatus: string };

export type UserDTO = {
  id: string;
  email: string;
  username: string;
  balanceCents: number;
  topShotScore: number;
  collectorScore: number;
  tradeTickets: number;
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
