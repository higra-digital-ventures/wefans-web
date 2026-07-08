import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getPackDetailServer } from '@/lib/api-server';
import MomentCard from '@/components/MomentCard';
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
      <Breadcrumbs items={[{ label: 'Pacotes', href: '/pacotes' }, { label: pack.name }]} />
      <header className="rounded-2xl mb-10  border border-line bg-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl uppercase text-ink">{pack.name}</h1>
            <p className="mt-1 text-muted">
              {pack.momentCount} Momentos · {remaining > 0 ? `${remaining.toLocaleString('pt-BR')} disponíveis` : 'esgotado'}
              {pack.guaranteeTier && ` · garante ${TIER_META[pack.guaranteeTier].label}+`}
            </p>
            {pack.setName && (
              <p className="mt-1 text-sm text-neutral-400">
                Coleção <span className="text-neutral-200">{pack.setName}</span>
                {pack.seriesName ? ` · ${pack.seriesName}` : ''}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[...TIER_ORDER]
                .reverse()
                .filter((tier) => (pack.oddsJson[tier] ?? 0) > 0)
                .map((tier) => [tier, pack.oddsJson[tier]] as [Tier, number])
                .map(([tier, p]) => {
                const meta = TIER_META[tier as Tier];
                return (
                  <span
                    key={tier}
                    className="px-2 py-0.5 text-xs font-medium"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    {meta.label} {(p * 100).toFixed(p * 100 < 1 ? 1 : 0)}%
                  </span>
                );
              })}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2 tabular-nums text-2xl text-accent3">{brl(pack.priceCents)}</div>
            <BuyPackButton packId={pack.id} priceCents={pack.priceCents} soldOut={remaining <= 0} />
          </div>
        </div>
      </header>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Momentos possíveis neste pacote
      </h2>
      {groups.map((g) => (
        <section key={g.tier} className="mb-10">
          <h3 className="mb-3 font-display text-xl" style={{ color: TIER_META[g.tier].color }}>
            {TIER_META[g.tier].label} <span className="text-sm text-muted">· {g.lances.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {g.lances.map((l) => (
              <MomentCard key={l.id} template={l} href={`/moment/${l.id}`} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
