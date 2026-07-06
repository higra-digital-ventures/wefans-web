import type { PrismaClient } from '@prisma/client';
import { simulatePlayerDay } from '../lib/matchSim';

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
    select: { id: true, name: true, club: true },
  });

  const scored = players
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
