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

export const fetchActivity = (limit = 20) =>
  request<{ sales: import('./types').RecentSale[] }>('GET', `/api/v1/market/activity?limit=${limit}`);

export const getNonce = () => request<{ nonce: string; expiresAt: string }>('GET', '/api/v1/checkin/nonce');

export const submitCheckin = (body: {
  fixtureId: string;
  lat: number;
  lng: number;
  accuracy: number;
  isMock: boolean;
  attestationToken: string;
  nonce: string;
}) => request<{ status: string; reason?: string; grantedPackInventoryId?: string }>('POST', '/api/v1/checkin', body);
