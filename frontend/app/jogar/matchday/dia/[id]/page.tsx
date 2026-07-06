import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFastbreakDayServer, getMe } from '@/lib/api-server';
import MatchdayDayClient from '@/components/MatchdayDayClient';

export const dynamic = 'force-dynamic';

function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default async function MatchdayDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [day, me] = await Promise.all([getFastbreakDayServer(id), getMe()]);
  if (!day) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/jogar/matchday" className="text-sm text-muted hover:text-ink">
        ← Matchday
      </Link>
      <Breadcrumbs
        items={[
          { label: 'Jogar', href: '/jogar' },
          { label: 'Matchday', href: '/jogar/matchday' },
          { label: 'Rodada' },
        ]}
      />
      <h1 className="mt-2 font-display text-4xl uppercase text-ink">
        {day.runName} · Dia {day.dayNumber}
      </h1>
      <p className="mb-6 text-muted">
        {new Date(day.gameDate).toLocaleDateString('pt-BR')} · alvo{' '}
        <span className="text-accent3">
          {day.targetScore} {day.statKey}
        </span>
        {day.survivor && <> · <Icon name="skull" size={13} className="inline align-[-2px]" /> mata-mata</>}
        {day.closed && ' · rodada fechada'}
      </p>

      <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,320px)]">
        <MatchdayDayClient day={day} isAdmin={!!me?.isAdmin} isAuthed={!!me} />

        <div className="rounded-2xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Board do dia
          </div>
          {day.board.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Ninguém escalou ainda.</p>
          ) : (
            <ul className="divide-y divide-line/50">
              {day.board.map((b) => (
                <li
                  key={b.username}
                  className={`rounded-lg flex items-center justify-between px-4 py-2.5 text-sm ${
                    me && b.username === me.username ? 'bg-accent3/10' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 text-ink">
                    <span className="w-6 tabular-nums text-[11px] text-neutral-500">#{b.rank}</span>
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
                      style={{ background: `hsl(${hue(b.username)} 70% 42%)` }}
                      aria-hidden
                    >
                      {b.username[0]}
                    </span>
                    @{b.username}
                    {me && b.username === me.username && (
                      <span className="text-[9px] font-bold uppercase text-accent3">você</span>
                    )}
                    {b.won === true && <Icon name="trophy" size={12} className="ml-1 inline align-[-2px] text-amber-300" />}
                  </span>
                  <span className="tabular-nums text-accent3">{b.score ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
