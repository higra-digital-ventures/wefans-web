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
