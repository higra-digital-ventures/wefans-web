import { cookies } from 'next/headers';
import type {
  UserDTO,
  Wallet,
  TeamDTO,
  PackDTO,
  TemplateDTO,
  MomentDTO,
  ProfileStats,
  PublicProfile,
  MarketListing,
  RecentSale,
  TemplateMarket,
  ActiveFixture,
  CheckinHistoryItem,
  OfferForMoment,
  MyOffer,
  ChallengeSummary,
  ChallengeDetail,
  DropSummary,
  DropDetail,
  PackListingDTO,
  MyPack,
  ShowcaseSummary,
  ShowcaseDetail,
  QuestDTO,
  TicketPack,
  LeaderboardSummary,
  LeaderboardDetail,
  ChecklistDTO,
  FastBreakRunDTO,
  FastBreakDayDetail,
  FastBreakStandings,
  FeedEvent,
  FeedPopular,
  FeedReactions,
  TemplateCollectors,
} from './types';

// Fetch no servidor (server components). Encaminha o cookie httpOnly de sessão à API.
const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';

async function serverFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });
  // 401 = deslogado; 404 = recurso não existe (ex.: id órfão após re-seed) — ambos viram null.
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} respondeu ${res.status}`);
  return (await res.json()) as T;
}

export async function getMe(): Promise<UserDTO | null> {
  const data = await serverFetch<{ user: UserDTO }>('/api/v1/me');
  return data?.user ?? null;
}

export async function getWalletServer(): Promise<Wallet | null> {
  return serverFetch<Wallet>('/api/v1/wallet');
}

export async function getTeamsServer(): Promise<TeamDTO[]> {
  const data = await serverFetch<{ teams: TeamDTO[] }>('/api/v1/teams');
  return data?.teams ?? [];
}

export async function getPacksServer(): Promise<PackDTO[]> {
  const data = await serverFetch<{ packs: PackDTO[] }>('/api/v1/packs');
  return data?.packs ?? [];
}

export async function getPackDetailServer(
  id: string,
): Promise<{ pack: PackDTO; possibleLances: TemplateDTO[] } | null> {
  return serverFetch(`/api/v1/packs/${id}`);
}

export async function getTemplatesServer(query = ''): Promise<TemplateDTO[]> {
  const data = await serverFetch<{ templates: TemplateDTO[] }>(`/api/v1/catalog/templates${query}`);
  return data?.templates ?? [];
}

export async function getMomentServer(id: string): Promise<MomentDTO | null> {
  const data = await serverFetch<{ moment: MomentDTO }>(`/api/v1/moments/${id}`);
  return data?.moment ?? null;
}

export async function getTemplateServer(id: string): Promise<TemplateDTO | null> {
  const data = await serverFetch<{ template: TemplateDTO }>(`/api/v1/catalog/templates/${id}`);
  return data?.template ?? null;
}

export async function getMyStatsServer(): Promise<ProfileStats | null> {
  return serverFetch<ProfileStats>('/api/v1/me/stats');
}

// null = não autenticado; [] = logado sem itens.
export async function getWishlistServer(): Promise<TemplateDTO[] | null> {
  const data = await serverFetch<{ templates: TemplateDTO[] }>('/api/v1/me/wishlist');
  return data ? data.templates : null;
}

export async function getPublicProfileServer(username: string): Promise<PublicProfile | null> {
  const data = await serverFetch<{ profile: PublicProfile }>(`/api/v1/users/${username}`);
  return data?.profile ?? null;
}

export async function getPublicCollectionServer(username: string): Promise<MomentDTO[]> {
  const data = await serverFetch<{ moments: MomentDTO[] }>(`/api/v1/users/${username}/collection`);
  return data?.moments ?? [];
}

export async function getMarketServer(query = ''): Promise<MarketListing[]> {
  const data = await serverFetch<{ listings: MarketListing[] }>(`/api/v1/market${query}`);
  return data?.listings ?? [];
}

export async function getActivityServer(limit = 20): Promise<RecentSale[]> {
  const data = await serverFetch<{ sales: RecentSale[] }>(`/api/v1/market/activity?limit=${limit}`);
  return data?.sales ?? [];
}

export async function getTemplateMarketServer(id: string): Promise<TemplateMarket | null> {
  return serverFetch<TemplateMarket>(`/api/v1/market/template/${id}`);
}

// null = não autenticado; [] = logado sem jogos ativos.
export async function getActiveFixturesServer(): Promise<ActiveFixture[] | null> {
  const data = await serverFetch<{ fixtures: ActiveFixture[] }>('/api/v1/fixtures/active');
  return data ? data.fixtures : null;
}

export async function getCheckinHistoryServer(): Promise<CheckinHistoryItem[]> {
  const data = await serverFetch<{ checkins: CheckinHistoryItem[] }>('/api/v1/checkin/history');
  return data?.checkins ?? [];
}

export async function getMomentOffersServer(momentId: string): Promise<OfferForMoment[]> {
  const data = await serverFetch<{ offers: OfferForMoment[] }>(`/api/v1/moments/${momentId}/offers`);
  return data?.offers ?? [];
}

export async function getMyOffersServer(): Promise<MyOffer[] | null> {
  const data = await serverFetch<{ offers: MyOffer[] }>('/api/v1/offers/mine');
  return data ? data.offers : null;
}

export async function getChallengesServer(): Promise<ChallengeSummary[]> {
  const data = await serverFetch<{ challenges: ChallengeSummary[] }>('/api/v1/challenges');
  return data?.challenges ?? [];
}

export async function getChallengeServer(id: string): Promise<ChallengeDetail | null> {
  const data = await serverFetch<{ challenge: ChallengeDetail }>(`/api/v1/challenges/${id}`);
  return data?.challenge ?? null;
}

export async function getDropsServer(): Promise<DropSummary[]> {
  const data = await serverFetch<{ drops: DropSummary[] }>('/api/v1/drops');
  return data?.drops ?? [];
}

export async function getDropServer(id: string): Promise<DropDetail | null> {
  const data = await serverFetch<{ drop: DropDetail }>(`/api/v1/drops/${id}`);
  return data?.drop ?? null;
}

export async function getPackMarketServer(): Promise<PackListingDTO[]> {
  const data = await serverFetch<{ listings: PackListingDTO[] }>('/api/v1/pack-market');
  return data?.listings ?? [];
}

export async function getMyPacksServer(): Promise<MyPack[] | null> {
  const data = await serverFetch<{ packs: MyPack[] }>('/api/v1/pack-market/mine');
  return data ? data.packs : null;
}

export async function getPublicShowcasesServer(): Promise<ShowcaseSummary[]> {
  const data = await serverFetch<{ showcases: ShowcaseSummary[] }>('/api/v1/showcases');
  return data?.showcases ?? [];
}

export async function getMyShowcasesServer(): Promise<ShowcaseSummary[] | null> {
  const data = await serverFetch<{ showcases: ShowcaseSummary[] }>('/api/v1/showcases/mine');
  return data ? data.showcases : null;
}

export async function getShowcaseServer(id: string): Promise<ShowcaseDetail | null> {
  const data = await serverFetch<{ showcase: ShowcaseDetail }>(`/api/v1/showcases/${id}`);
  return data?.showcase ?? null;
}

export async function getQuestsServer(): Promise<QuestDTO[]> {
  const data = await serverFetch<{ quests: QuestDTO[] }>('/api/v1/quests');
  return data?.quests ?? [];
}

export async function getTicketPacksServer(): Promise<TicketPack[]> {
  const data = await serverFetch<{ packs: TicketPack[] }>('/api/v1/tickets/packs');
  return data?.packs ?? [];
}

export async function getLeaderboardsServer(): Promise<LeaderboardSummary[]> {
  const data = await serverFetch<{ leaderboards: LeaderboardSummary[] }>('/api/v1/leaderboards');
  return data?.leaderboards ?? [];
}

export async function getLeaderboardServer(id: string): Promise<LeaderboardDetail | null> {
  const data = await serverFetch<{ leaderboard: LeaderboardDetail }>(`/api/v1/leaderboards/${id}`);
  return data?.leaderboard ?? null;
}

export async function getChecklistsServer(): Promise<ChecklistDTO[]> {
  const data = await serverFetch<{ checklists: ChecklistDTO[] }>('/api/v1/checklists');
  return data?.checklists ?? [];
}

export async function getFastbreakRunsServer(): Promise<FastBreakRunDTO[]> {
  const data = await serverFetch<{ runs: FastBreakRunDTO[] }>('/api/v1/fastbreak');
  return data?.runs ?? [];
}

export async function getFastbreakDayServer(id: string): Promise<FastBreakDayDetail | null> {
  const data = await serverFetch<{ day: FastBreakDayDetail }>(`/api/v1/fastbreak/days/${id}`);
  return data?.day ?? null;
}

export async function getFastbreakStandingsServer(runId: string): Promise<FastBreakStandings | null> {
  const data = await serverFetch<{ leaderboard: FastBreakStandings }>(`/api/v1/fastbreak/runs/${runId}/leaderboard`);
  return data?.leaderboard ?? null;
}

// Genérico para as telas de admin (todas exigem cookie de admin; 401/403 → null).
export async function adminGet<T>(path: string): Promise<T | null> {
  try {
    return await serverFetch<T>(`/api/v1${path}`);
  } catch {
    return null;
  }
}

// Retorna null se não autenticado (401); [] se logado e sem Moments.
export async function getCollectionServer(query = ''): Promise<MomentDTO[] | null> {
  const data = await serverFetch<{ moments: MomentDTO[] }>(`/api/v1/collection${query}`);
  return data ? data.moments : null;
}

export async function getFeedServer(
  limit = 30,
): Promise<{ events: FeedEvent[]; popular: FeedPopular; reactions?: FeedReactions } | null> {
  return serverFetch<{ events: FeedEvent[]; popular: FeedPopular; reactions?: FeedReactions }>(
    `/api/v1/feed?limit=${limit}`,
  );
}

export async function getTemplateCollectorsServer(id: string): Promise<TemplateCollectors | null> {
  return serverFetch<TemplateCollectors>(`/api/v1/catalog/templates/${id}/collectors`);
}

export async function getPublicWishlistServer(username: string): Promise<TemplateDTO[]> {
  const data = await serverFetch<{ templates: TemplateDTO[] }>(
    `/api/v1/users/${encodeURIComponent(username)}/wishlist`,
  );
  return data?.templates ?? [];
}
