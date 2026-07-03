import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeaderboardServer, getMe } from '@/lib/api-server';
import RankingClient from '@/components/RankingClient';

export const dynamic = 'force-dynamic';

export default async function RankingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [board, me] = await Promise.all([getLeaderboardServer(id), getMe()]);
  if (!board) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/jogar/rankings" className="text-sm text-muted hover:text-ink">
        ← Rankings
      </Link>
      <h1 className="mt-2 font-display text-4xl uppercase text-ink">{board.name}</h1>
      <p className="mb-6 text-muted">
        {board.kind === 'TEAM' ? 'Ranking de time' : 'Ranking de jogador'} · prêmio do topo:{' '}
        <span className="text-accent3">
          {typeof board.rewards === 'object' && board.rewards && 'top1' in board.rewards
            ? String((board.rewards as { top1?: string }).top1)
            : '—'}
        </span>
      </p>

      <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,340px)]">
        <div className="border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Colecionador</th>
                <th className="px-4 py-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {board.entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Sem participantes ainda — seja o primeiro a travar um Lance.
                  </td>
                </tr>
              ) : (
                board.entries.map((e) => (
                  <tr key={e.username} className="border-b border-line/50 last:border-0">
                    <td className="px-4 py-2.5 font-display text-ink">#{e.rank}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/u/${e.username}`} className="text-ink hover:text-accent">
                        @{e.username}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-accent3">
                      {e.points.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <RankingClient board={board} isAdmin={!!me?.isAdmin} isAuthed={!!me} />
      </div>
    </main>
  );
}
