import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFastbreakDayServer, getMe } from '@/lib/api-server';
import PeladaDayClient from '@/components/PeladaDayClient';

export const dynamic = 'force-dynamic';

export default async function PeladaDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [day, me] = await Promise.all([getFastbreakDayServer(id), getMe()]);
  if (!day) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/jogar/pelada" className="text-sm text-muted hover:text-ink">
        ← Pelada
      </Link>
      <h1 className="mt-2 font-display text-4xl uppercase text-ink">
        {day.runName} · Dia {day.dayNumber}
      </h1>
      <p className="mb-6 text-muted">
        {new Date(day.gameDate).toLocaleDateString('pt-BR')} · alvo{' '}
        <span className="text-accent3">
          {day.targetScore} {day.statKey}
        </span>
        {day.survivor && ' · ☠️ mata-mata'}
        {day.closed && ' · rodada fechada'}
      </p>

      <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,320px)]">
        <PeladaDayClient day={day} isAdmin={!!me?.isAdmin} isAuthed={!!me} />

        <div className="rounded-2xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Board do dia
          </div>
          {day.board.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Ninguém escalou ainda.</p>
          ) : (
            <ul className="divide-y divide-line/50">
              {day.board.map((b) => (
                <li key={b.username} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-ink">
                    #{b.rank} @{b.username}
                    {b.won === true && ' 🏆'}
                  </span>
                  <span className="font-mono text-accent3">{b.score ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
