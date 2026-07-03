import Link from 'next/link';
import {
  getChallengesServer,
  getQuestsServer,
  getLeaderboardsServer,
  getChecklistsServer,
  getFastbreakRunsServer,
} from '@/lib/api-server';

export const dynamic = 'force-dynamic';

// Hub do Jogar: um card por modo, com contagem viva — o visitante entende os 5
// jogos de uma olhada em vez de cair direto na página de desafios.
export default async function JogarPage() {
  const [challenges, quests, leaderboards, checklists, runs] = await Promise.all([
    getChallengesServer().catch(() => []),
    getQuestsServer().catch(() => []),
    getLeaderboardsServer().catch(() => []),
    getChecklistsServer().catch(() => []),
    getFastbreakRunsServer().catch(() => []),
  ]);

  const activeChallenges = challenges.filter((c) => c.active && !c.completed).length;
  const openDays = runs.reduce((n, r) => n + r.days.filter((d) => !d.closed).length, 0);

  const MODES = [
    {
      href: '/jogar/desafios',
      name: 'Desafios',
      color: '#ff2e88',
      description: 'Colecione os Lances pedidos (ou forje, queimando a entrada) e ganhe recompensas.',
      stat: activeChallenges > 0 ? `${activeChallenges} ativo${activeChallenges > 1 ? 's' : ''} agora` : 'nenhum ativo',
      d: 'M18 4V2H6v2H2v3a5 5 0 0 0 5 5h.4A6 6 0 0 0 11 14.9V18H7v4h10v-4h-4v-3.1a6 6 0 0 0 3.6-2.9H17a5 5 0 0 0 5-5V4Z',
    },
    {
      href: '/jogar/matchday',
      name: 'Matchday',
      color: '#21d4e0',
      description: 'Fantasy diário: escale 5 Lances, bata o alvo do dia e sobreviva ao mata-mata.',
      stat: openDays > 0 ? `${openDays} rodada${openDays > 1 ? 's' : ''} aberta${openDays > 1 ? 's' : ''}` : 'sem rodadas abertas',
      d: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2 2.4 1.8-1 2.8h-2.9l-1-2.8Zm-7 8.3 2.9-.4 1.3 2.6-1.9 2.2-2.2-1.5a8 8 0 0 1-.1-2.9Zm3.8 7 .9-2.7h4.6l.9 2.7a8 8 0 0 1-6.4 0Zm9.4-2.6-1.9-2.2 1.3-2.6 2.9.4a8 8 0 0 1-2.3 4.4Z',
    },
    {
      href: '/jogar/rankings',
      name: 'Rankings',
      color: '#9d4edd',
      description: 'Trave Lances para pontuar no ranking do seu time ou jogador e dispute prêmios.',
      stat: `${leaderboards.length} ranking${leaderboards.length !== 1 ? 's' : ''}`,
      d: 'M4 22V10h4v12H4Zm6 0V2h4v20h-4Zm6 0v-8h4v8h-4Z',
    },
    {
      href: '/jogar/missoes',
      name: 'Missões',
      color: '#ff9e2c',
      description: 'Caças ao tesouro: monte vitrines e cumpra critérios especiais por recompensas.',
      stat: `${quests.length} missão${quests.length !== 1 ? '~es' : ''}`.replace('~', 'õ'),
      d: 'M12 2 9.5 8.5 2 9.3l5.5 4.9L5.8 22 12 18.3 18.2 22l-1.7-7.8L22 9.3l-7.5-.8Z',
    },
    {
      href: '/jogar/checklists',
      name: 'Checklists',
      color: '#22c55e',
      description: 'Complete a coleção de um time ou série e ganhe bônus de pontos.',
      stat: `${checklists.length} checklist${checklists.length !== 1 ? 's' : ''}`,
      d: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z',
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Jogar</h1>
      <p className="mb-8 text-muted">
        Seus Lances não são só colecionáveis — são peças de jogo. Escolha um modo.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group border border-line bg-panel p-5 transition-colors hover:border-white/30"
          >
            <span
              className="mb-4 flex h-10 w-10 items-center justify-center"
              style={{ background: `${m.color}1a` }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" style={{ fill: m.color }}>
                <path d={m.d} />
              </svg>
            </span>
            <h2 className="font-display text-2xl uppercase text-ink">{m.name}</h2>
            <p className="mt-1 min-h-[3em] text-sm leading-snug text-muted">{m.description}</p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: m.color }}>
              {m.stat} →
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
