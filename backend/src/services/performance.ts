import type { PrismaClient } from '@prisma/client';
import { simulatePlayerDay } from '../lib/matchSim';
import { toTemplateDTO } from '../lib/dto';

/**
 * Performance → mercado (o mecanismo nº 1 de valorização do Top Shot):
 * o matchSim já decide quem marcou hoje; aqui isso vira sinal de produto —
 * artilheiros do dia ganham destaque nos cards, no feed e no termômetro.
 */

export type HotPlayer = {
  playerId: string;
  name: string;
  club: string;
  gols: number;
  assistencias: number;
  nota: number;
  /** template mais valioso do jogador — a "cara" do destaque no feed */
  topTemplateId: string | null;
};

const dayKey = () => new Date().toISOString().slice(0, 10);
let cache: { day: string; data: HotPlayer[] } | null = null;

export async function getHotPlayersToday(db: PrismaClient): Promise<HotPlayer[]> {
  const day = dayKey();
  if (cache && cache.day === day) return cache.data; // determinístico por dia

  // só jogadores com Lances visíveis interessam ao mercado
  const players = await db.player.findMany({
    where: { templates: { some: { status: { in: ['PUBLICADO', 'ENCERRADO'] } } } },
    select: { id: true, name: true, club: true, position: true },
  });

  const scored = players
    .filter((p) => p.position !== 'GOL') // goleiro não vira artilheiro do dia
    .map((p) => ({ p, box: simulatePlayerDay(new Date(), p.id) }))
    .filter((x) => x.box.gols >= 2) // artilheiro do dia = 2+ gols
    .sort((a, b) => b.box.gols - a.box.gols || b.box.nota - a.box.nota)
    .slice(0, 8);

  const tops = await db.template.findMany({
    where: {
      playerId: { in: scored.map((x) => x.p.id) },
      status: { in: ['PUBLICADO', 'ENCERRADO'] },
    },
    orderBy: { aspCents: 'desc' },
    select: { id: true, playerId: true },
  });
  const topOf = new Map<string, string>();
  for (const t of tops) if (!topOf.has(t.playerId)) topOf.set(t.playerId, t.id);

  const data = scored.map(({ p, box }) => ({
    playerId: p.id,
    name: p.name,
    club: p.club,
    gols: box.gols,
    assistencias: box.assistencias,
    nota: box.nota,
    topTemplateId: topOf.get(p.id) ?? null,
  }));
  cache = { day, data };
  return data;
}

/**
 * Movers 24h: edições cujo preço médio de venda mais mudou vs as 24h anteriores.
 * Exige venda nas DUAS janelas (sem base de comparação não há "subiu/caiu").
 */
export type Mover = {
  template: ReturnType<typeof toTemplateDTO>;
  pct: number; // variação % do preço médio (24h vs 24h anteriores)
  avgCents: number; // média das últimas 24h
};

const MOVERS_TTL_MS = 5 * 60_000;
let moversCache: { ts: number; data: Mover[] } | null = null;

export async function getMovers(db: PrismaClient): Promise<Mover[]> {
  if (moversCache && Date.now() - moversCache.ts < MOVERS_TTL_MS) return moversCache.data;
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since48 = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const txs = await db.transaction.findMany({
    where: {
      type: { in: ['BUY', 'OFFER_ACCEPT'] },
      amountCents: { gt: 0 },
      createdAt: { gte: since48 },
    },
    include: { moment: { include: { template: { include: { player: true } } } } },
    take: 1000,
  });

  const byTemplate = new Map<
    string,
    { template: (typeof txs)[number]['moment']['template']; cur: number[]; prev: number[] }
  >();
  for (const t of txs) {
    const tpl = t.moment.template;
    const e = byTemplate.get(tpl.id) ?? { template: tpl, cur: [], prev: [] };
    (t.createdAt >= since24 ? e.cur : e.prev).push(t.amountCents);
    byTemplate.set(tpl.id, e);
  }
  const avg = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
  const data = [...byTemplate.values()]
    .filter((e) => e.cur.length > 0 && e.prev.length > 0)
    .map((e) => ({
      template: toTemplateDTO(e.template),
      pct: Math.round((avg(e.cur) / avg(e.prev) - 1) * 100),
      avgCents: Math.round(avg(e.cur)),
    }))
    .filter((m) => Math.abs(m.pct) >= 10) // só movimento relevante
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 4);
  moversCache = { ts: Date.now(), data };
  return data;
}





