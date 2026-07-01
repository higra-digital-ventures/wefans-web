import { cookies } from 'next/headers';
import type { UserDTO, Wallet, TeamDTO } from './types';

// Fetch no servidor (server components). Encaminha o cookie httpOnly de sessão à API.
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000';

async function serverFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });
  if (res.status === 401) return null;
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
