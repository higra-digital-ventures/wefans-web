import Link from 'next/link';
import { getDropsServer } from '@/lib/api-server';
import { TIER_META } from '@/lib/tiers';
import type { Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendado',
  WAITING: 'Sala de espera',
  LIVE: 'Ao vivo',
  ENDED: 'Encerrado',
};

export default async function DropsPage() {
  const drops = await getDropsServer();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Drops</h1>
      <p className="mb-8 text-muted">Sala de espera, fila aleatória e janela de compra.</p>

      {drops.length === 0 ? (
        <p className="text-muted">Nenhum drop no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {drops.map((d) => (
            <Link
              key={d.id}
              href={`/drop/${d.id}`}
              className="block rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-accent/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    d.status === 'LIVE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-panel2 text-muted'
                  }`}
                >
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
                {d.requiredCollectorScore > 0 && (
                  <span className="text-xs text-muted">Score mín. {d.requiredCollectorScore}</span>
                )}
              </div>
              <h3 className="font-display text-xl text-ink">{d.name}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.packs.map((p) => (
                  <span key={p.id} className="rounded bg-panel2 px-2 py-0.5 text-xs text-muted">
                    {p.name} · {(p.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                ))}
              </div>
              {d.packs[0] && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(d.packs[0].oddsJson).map(([tier, p]) => {
                    const meta = TIER_META[tier as Tier];
                    return (
                      <span
                        key={tier}
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{ background: `${meta.color}22`, color: meta.color }}
                      >
                        {meta.label} {(p * 100).toFixed(p * 100 < 1 ? 1 : 0)}%
                      </span>
                    );
                  })}
                </div>
              )}
              {d.hasRebound && <p className="mt-3 text-xs text-accent3">com rebound</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
