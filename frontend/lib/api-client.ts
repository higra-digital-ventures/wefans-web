'use client';

// Chamadas do browser à API. `credentials: 'include'` garante o envio/recebimento
// do cookie httpOnly de sessão (mesmo site: localhost:3000 → :4000).
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message ?? `Erro ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const login = (email: string, password: string) =>
  request('POST', '/api/v1/auth/login', { email, password });

export const register = (email: string, username: string, password: string) =>
  request('POST', '/api/v1/auth/register', { email, username, password });

export const logout = () => request('POST', '/api/v1/auth/logout', {});

// cadastro: usuário disponível? (200 = já existe, 404 = livre)
export async function checkUsername(username: string): Promise<boolean> {
  const res = await fetch(`${API}/api/v1/users/${encodeURIComponent(username)}`, {
    credentials: 'include',
  });
  return res.status === 404;
}

export const deposit = (amountCents: number) =>
  request('POST', '/api/v1/wallet/deposit', { amountCents });

export const patchFavoriteTeam = (favoriteTeamId: string | null) =>
  request('PATCH', '/api/v1/me', { favoriteTeamId });

export const buyPack = (packId: string) =>
  request<{ inventoryId: string; balanceCents: number }>('POST', `/api/v1/packs/${packId}/buy`);

export const openPack = (inventoryId: string) =>
  request<{ moments: import('./types').MomentDTO[] }>(
    'POST',
    `/api/v1/packs/inventory/${inventoryId}/open`,
  );

export const addWishlist = (templateId: string) =>
  request('POST', `/api/v1/me/wishlist/${templateId}`);

export const removeWishlist = (templateId: string) =>
  request('DELETE', `/api/v1/me/wishlist/${templateId}`);

export const createListing = (momentId: string, priceCents: number) =>
  request<{ listing: { id: string; priceCents: number } }>('POST', '/api/v1/listings', {
    momentId,
    priceCents,
  });

export const cancelListing = (listingId: string) =>
  request('DELETE', `/api/v1/listings/${listingId}`);

export const buyMoment = (listingId: string) =>
  request<{ momentId: string; flagged: boolean }>('POST', `/api/v1/listings/${listingId}/buy`);

// 🔥 alterna a reação num evento do feed
export const reactFeed = (eventKey: string) =>
  request<{ reacted: boolean; count: number }>('POST', '/api/v1/feed/react', { eventKey });

export const fetchActivity = (limit = 20) =>
  request<{ sales: import('./types').RecentSale[] }>('GET', `/api/v1/market/activity?limit=${limit}`);

export const getNonce = () => request<{ nonce: string; expiresAt: string }>('GET', '/api/v1/checkin/nonce');

export const lockMoment = (id: string) => request('POST', `/api/v1/moments/${id}/lock`);
export const burnMoment = (id: string) => request('POST', `/api/v1/moments/${id}/burn`);
export const giftMoment = (id: string, toUsername: string) =>
  request('POST', `/api/v1/moments/${id}/gift`, { toUsername });

export const makeOffer = (body: {
  momentId?: string;
  templateId?: string;
  priceCents: number;
  expiresAt?: string;
}) => request('POST', '/api/v1/offers', body);
export const acceptOffer = (offerId: string, momentId?: string) =>
  request('POST', `/api/v1/offers/${offerId}/accept`, momentId ? { momentId } : undefined);
export const cancelOffer = (offerId: string) => request('DELETE', `/api/v1/offers/${offerId}`);

export const submitChallenge = (challengeId: string, momentIds: string[]) =>
  request<{ status: string; grantedPackInventoryId?: string; rewardMomentId?: string }>(
    'POST',
    `/api/v1/challenges/${challengeId}/submit`,
    { momentIds },
  );

export const createShowcase = (body: { name: string; description?: string; public?: boolean }) =>
  request<{ showcase: { id: string } }>('POST', '/api/v1/showcases', body);
export const updateShowcase = (id: string, body: { name?: string; description?: string; public?: boolean }) =>
  request('PATCH', `/api/v1/showcases/${id}`, body);
export const deleteShowcase = (id: string) => request('DELETE', `/api/v1/showcases/${id}`);
export const addShowcaseItem = (id: string, momentId: string) =>
  request('POST', `/api/v1/showcases/${id}/items`, { momentId });
export const removeShowcaseItem = (id: string, momentId: string) =>
  request('DELETE', `/api/v1/showcases/${id}/items/${momentId}`);

export const claimQuest = (id: string) =>
  request<{ status: string; rewardMomentId?: string }>('POST', `/api/v1/quests/${id}/claim`);

export const redeemMomentTicket = (momentId: string) =>
  request<{ tradeTickets: number }>('POST', `/api/v1/moments/${momentId}/redeem-ticket`);
export const redeemTicketsForPack = (packId: string) =>
  request<{ inventoryId: string; tradeTickets: number }>('POST', `/api/v1/tickets/packs/${packId}/redeem`);

export const lockToLeaderboard = (leaderboardId: string, momentId: string) =>
  request<{ locked: boolean; points: number }>('POST', `/api/v1/leaderboards/${leaderboardId}/lock`, { momentId });
export const snapshotLeaderboard = (leaderboardId: string) =>
  request('POST', `/api/v1/admin/leaderboards/${leaderboardId}/snapshot`);
export const claimChecklist = (checklistId: string) =>
  request<{ claimed: boolean; bonusPoints: number }>('POST', `/api/v1/checklists/${checklistId}/claim`);

export const submitFastbreakLineup = (dayId: string, momentIds: string[], captainMomentId?: string) =>
  request('POST', `/api/v1/fastbreak/days/${dayId}/lineup`, { momentIds, captainMomentId });
export const closeFastbreakDay = (dayId: string) =>
  request('POST', `/api/v1/admin/fastbreak/days/${dayId}/close`);

// Genérico para ações de admin (Fase 10).
export const adminPost = <T = unknown>(path: string, body?: unknown) =>
  request<T>('POST', `/api/v1${path}`, body);

export const joinDrop = (dropId: string) => request('POST', `/api/v1/drops/${dropId}/join`);
export const startDrop = (dropId: string) => request('POST', `/api/v1/admin/drops/${dropId}/start`);
export const buyDropPack = (dropId: string, packId: string) =>
  request<{ inventoryId: string; viaRebound: boolean }>('POST', `/api/v1/drops/${dropId}/buy`, { packId });

export const buyPackListing = (listingId: string) =>
  request<{ packInventoryId: string }>('POST', `/api/v1/pack-market/${listingId}/buy`);
export const listPack = (packInventoryId: string, priceCents: number) =>
  request('POST', '/api/v1/pack-market/list', { packInventoryId, priceCents });
export const cancelPackListing = (listingId: string) =>
  request('DELETE', `/api/v1/pack-market/${listingId}`);

export const submitCheckin = (body: {
  fixtureId: string;
  lat: number;
  lng: number;
  accuracy: number;
  isMock: boolean;
  attestationToken: string;
  nonce: string;
}) => request<{ status: string; reason?: string; grantedPackInventoryId?: string }>('POST', '/api/v1/checkin', body);

export const fetchFeed = (limit = 20) =>
  request<{ events: { id: string }[] }>('GET', `/api/v1/feed?limit=${limit}`);

export const patchShowInFeed = (showInFeed: boolean) =>
  request('PATCH', '/api/v1/me', { showInFeed });

export const fetchNotifications = () =>
  request<{ notifications: import('./types').NotificationDTO[]; unreadCount: number }>(
    'GET',
    '/api/v1/me/notifications',
  );

export const markNotificationsSeen = () => request('POST', '/api/v1/me/notifications/seen', {});

export const fetchTemplates = () =>
  request<{ templates: import('./types').TemplateDTO[] }>('GET', '/api/v1/catalog/templates');

export const fetchChats = () =>
  request<{ chats: import('./types').ChatSummary[]; totalUnread: number }>('GET', '/api/v1/me/chats');

export const fetchThread = (username: string) =>
  request<{ with: string; messages: import('./types').ChatMessageDTO[] }>(
    'GET',
    `/api/v1/me/chats/${encodeURIComponent(username)}`,
  );

export const sendChatMessage = (username: string, body: string) =>
  request<{ message: import('./types').ChatMessageDTO }>(
    'POST',
    `/api/v1/me/chats/${encodeURIComponent(username)}`,
    { body },
  );
