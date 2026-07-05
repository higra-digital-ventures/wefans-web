import EmptyState from '@/components/EmptyState';
import Link from 'next/link';
import { getLeaderboardsServer } from '@/lib/api-server';

export const dynamic = 'force-dynamic';

export default async function RankingsPage() {
  const boards = await getLeaderboardsServer();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-1 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-4xl uppercase text-ink">Rankings</h1>
        <span className="text-sm">
          <Link href="/jogar/desafios" className="text-accent3 hover:underline">Desafios</Link>
          <span className="text-muted"> · </span>
          <Link href="/jogar/checklists" className="text-accent3 hover:underline">Checklists</Link>
        </span>
      </div>
      <p className="mb-8 text-muted">A disputa da torcida: trave Lances do seu time ou craque e brigue pelo topo — o pack vai para quem estiver lá no apito final.</p>

      {boards.length === 0 ? (
        <EmptyState
          title="Nenhuma disputa aberta agora"
          hint="Os rankings abrem por rodada — volte no próximo jogo."
          cta={{ label: 'Ver desafios ativos', href: '/jogar/desafios' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/jogar/rankings/${b.id}`}
              className="block  border border-line bg-panel p-5 transition-colors hover:border-accent/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                  {b.kind === 'TEAM' ? 'Time' : 'Jogador'}
                </span>
                {b.snapshotAt ? (
                  <span className="text-xs text-muted">encerrado</span>
                ) : (
                  <span className="text-xs text-emerald-300">ativo</span>
                )}
              </div>
              <h3 className="font-display text-xl text-ink">{b.name}</h3>
              <ol className="mt-3 space-y-1 text-sm">
                {b.top.map((e, i) => (
                  <li key={e.username} className="flex justify-between">
                    <span className="text-muted">
                      #{e.rank ?? i + 1} @{e.username}
                    </span>
                    <span className="tabular-nums text-accent3">{e.points.toLocaleString('pt-BR')}</span>
                  </li>
                ))}
                {b.top.length === 0 && <li className="text-muted">Ninguém pontuou ainda — chegue primeiro.</li>}
              </ol>
              {b.myPoints !== null && (
                <p className="mt-3 text-xs text-muted">
                  Você: <span className="text-ink">{b.myPoints.toLocaleString('pt-BR')} pts</span>
                  {b.myRank ? ` · #${b.myRank}` : ''}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
