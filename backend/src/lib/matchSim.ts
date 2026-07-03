// Motor de partidas simulado (seção 8): boxscores fictícios por jogador,
// determinísticos por data (seed = dia + playerId). Fonte de verdade para
// Desafios Relâmpago (Fase 8) e Fast Break/Matchday (Fase 9).

export interface BoxScore {
  playerId: string;
  gols: number;
  assistencias: number;
  defesas: number;
  desarmes: number;
  nota: number; // 5.0–10.0
}

function hash(str: string): number {
  // FNV-1a 32 bits
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

function weighted(r: number, weights: [number, number][]): number {
  let acc = 0;
  for (const [value, w] of weights) {
    acc += w;
    if (r < acc) return value;
  }
  return weights[weights.length - 1][0];
}

/** Boxscore determinístico de um jogador num dia. */
export function simulatePlayerDay(gameDate: Date, playerId: string): BoxScore {
  const rand = mulberry32(hash(`${dayKey(gameDate)}:${playerId}`));
  return {
    playerId,
    gols: weighted(rand(), [[0, 0.55], [1, 0.28], [2, 0.12], [3, 0.05]]),
    assistencias: weighted(rand(), [[0, 0.5], [1, 0.3], [2, 0.15], [3, 0.05]]),
    defesas: Math.floor(rand() * 7), // 0–6
    desarmes: Math.floor(rand() * 6), // 0–5
    nota: Math.round((5 + rand() * 5) * 10) / 10,
  };
}

/** Boxscores do dia para uma lista de jogadores. Reproduzível (mesma data → mesmos números). */
export function simulateDay(gameDate: Date, playerIds: string[]): BoxScore[] {
  return playerIds.map((id) => simulatePlayerDay(gameDate, id));
}
