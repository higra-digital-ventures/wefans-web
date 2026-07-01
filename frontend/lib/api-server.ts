import { cookies } from 'next/headers';
import type {
  UserDTO,
  Wallet,
  TeamDTO,
  PackDTO,
  TemplateDTO,
  MomentDTO,
} from './types';

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

// Retorna null se não autenticado (401); [] se logado e sem Moments.
export async function getCollectionServer(query = ''): Promise<MomentDTO[] | null> {
  const data = await serverFetch<{ moments: MomentDTO[] }>(`/api/v1/collection${query}`);
  return data ? data.moments : null;
}
