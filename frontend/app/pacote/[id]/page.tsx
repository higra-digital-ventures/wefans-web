import { notFound } from 'next/navigation';
import { getPackDetailServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import BuyPackButton from '@/components/BuyPackButton';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPackDetailServer(id);
  if (!data) notFound();

  const { pack, possibleLances } = data;
  const remaining = pack.totalSupply - pack.soldCount;
  const groups = TIER_ORDER.map((t) => ({
    tier: t,
    lances: possibleLances.filter((l) => l.tier === t),
  })).filter((g) => g.lances.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 rounded-2xl border border-line bg-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl uppercase text-ink">{pack.name}</h1>
            <p className="mt-1 text-muted">
              {pack.momentCount} Lances · {remaining > 0 ? `${remaining.toLocaleString('pt-BR')} disponíveis` : 'esgotado'}
              {pack.guaranteeTier && ` · garante ${TIER_META[pack.guaranteeTier].label}+`}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(pack.oddsJson).map(([tier, p]) => {
                const meta = TIER_META[tier as Tier];
                return (
                  <span
                    key={tier}
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    {meta.label} {(p * 100).toFixed(p * 100 < 1 ? 1 : 0)}%
                  </span>
                );
              })}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2 font-mono text-2xl text-accent3">{brl(pack.priceCents)}</div>
            <BuyPackButton packId={pack.id} priceCents={pack.priceCents} soldOut={remaining <= 0} />
          </div>
        </div>
      </header>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Lances possíveis neste pacote
      </h2>
      {groups.map((g) => (
        <section key={g.tier} className="mb-10">
          <h3 className="mb-3 font-display text-xl" style={{ color: TIER_META[g.tier].color }}>
            {TIER_META[g.tier].label} <span className="text-sm text-muted">· {g.lances.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {g.lances.map((l) => (
              <LanceCard key={l.id} template={l} href={`/lance/${l.id}`} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
