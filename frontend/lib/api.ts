// Cliente fino da API. Nenhuma regra de negócio aqui (seção A1) — só busca/serializa.
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${path} respondeu ${res.status}`);
  }
  return (await res.json()) as T;
}

export type Health = {
  status: string;
  service: string;
  version: string;
  time: string;
};

export type SystemStats = {
  stats: {
    users: number;
    series: number;
    sets: number;
    players: number;
    templates: number;
    moments: number;
    packs: number;
    drops: number;
    teams: number;
    stadiums: number;
    fixtures: number;
    challenges: number;
  };
};

export const getHealth = () => apiFetch<Health>('/api/v1/health');
export const getSystemStats = () => apiFetch<SystemStats>('/api/v1/system/stats');
