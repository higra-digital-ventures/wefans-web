import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getDropServer, getMe } from '@/lib/api-server';
import DropClient from '@/components/DropClient';
import { TIER_META } from '@/lib/tiers';
import { brl, dateTime } from '@/lib/format';
import type { Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [drop, me] = await Promise.all([getDropServer(id), getMe()]);
  if (!drop) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Breadcrumbs items={[{ label: 'Drops', href: '/drops' }, { label: drop.name }]} />
      <Link href="/drops" className="text-sm text-muted hover:text-ink">
        ← Drops
      </Link>
      <h1 className="mt-2 font-display text-4xl uppercase text-ink">{drop.name}</h1>
      <p className="mb-6 text-muted">
        {drop.status === 'WAITING' && `Sala de espera aberta · abre a fila em ${dateTime(drop.startsAt)}`}
        {drop.status === 'LIVE' && 'Fila ao vivo'}
        {drop.hasRebound && ' · com rebound'}
      </p>

      <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,300px)]">
        <DropClient drop={drop} isAdmin={!!me?.isAdmin} isAuthed={!!me} />

        <div className="space-y-4">
          {drop.packs.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-ink">{p.name}</span>
                <span className="tabular-nums text-sm text-accent3">{brl(p.priceCents)}</span>
              </div>
              <p className="mb-2 text-xs text-muted">
                {p.momentCount} Momentos · {(p.totalSupply - p.soldCount).toLocaleString('pt-BR')} restantes
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(p.oddsJson).map(([tier, prob]) => {
                  const meta = TIER_META[tier as Tier];
                  return (
                    <span key={tier} className="px-1.5 py-0.5 text-[10px]" style={{ background: `${meta.color}22`, color: meta.color }}>
                      {meta.label} {(prob * 100).toFixed(prob * 100 < 1 ? 1 : 0)}%
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
