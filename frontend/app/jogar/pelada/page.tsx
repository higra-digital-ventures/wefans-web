import Link from 'next/link';
import { getFastbreakRunsServer, getFastbreakStandingsServer } from '@/lib/api-server';

export const dynamic = 'force-dynamic';

export default async function PeladaPage() {
  const runs = await getFastbreakRunsServer();
  const standings = await Promise.all(runs.map((r) => getFastbreakStandingsServer(r.id)));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-1 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-4xl uppercase text-ink">Pelada</h1>
        <Link href="/jogar/desafios" className="text-sm text-accent3 hover:underline">
          desafios →
        </Link>
      </div>
      <p className="mb-8 text-muted">
        Fantasy diário: escale seus Lances, bata o alvo do dia e suba no ranking do run.
      </p>

      {runs.length === 0 ? (
        <p className="text-muted">Nenhum run ativo.</p>
      ) : (
        <div className="space-y-8">
          {runs.map((r, idx) => (
            <section key={r.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl text-ink">{r.name}</h2>
                  <p className="text-xs text-muted">
                    {r.survivor ? '☠️ mata-mata (quem perde está fora)' : `escalação de ${r.lineupSize}`}
                    {r.myWins > 0 && ` · suas vitórias: ${r.myWins}`}
                    {r.eliminated && ' · você foi eliminado'}
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {r.days.map((d) => (
                  <Link
                    key={d.id}
                    href={`/jogar/pelada/dia/${d.id}`}
                    className={`rounded-xl border p-3 text-center transition-colors hover:border-accent/50 ${
                      d.closed ? 'border-line opacity-60' : 'border-accent3/40'
                    }`}
                  >
                    <div className="font-display text-lg text-ink">Dia {d.dayNumber}</div>
                    <div className="text-[11px] text-muted">
                      {d.targetScore} {d.statKey}
                    </div>
                    <div className={`text-[10px] ${d.closed ? 'text-muted' : 'text-emerald-300'}`}>
                      {d.closed ? 'fechado' : 'aberto'}
                    </div>
                  </Link>
                ))}
              </div>

              {standings[idx] && standings[idx]!.standings.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
                    Ranking do run (vitórias)
                  </h3>
                  <ol className="space-y-1 text-sm">
                    {standings[idx]!.standings.slice(0, 5).map((s) => (
                      <li key={s.username} className="flex justify-between">
                        <span className="text-muted">
                          #{s.rank} @{s.username}
                          {s.eliminated && ' ☠️'}
                        </span>
                        <span className="font-mono text-accent3">
                          {s.wins}V · {s.totalScore} pts
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
