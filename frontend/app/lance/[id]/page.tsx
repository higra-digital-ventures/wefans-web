import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTemplateServer, getWishlistServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import OwnershipStats from '@/components/OwnershipStats';
import WishlistButton from '@/components/WishlistButton';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function LancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, wishlist] = await Promise.all([getTemplateServer(id), getWishlistServer()]);
  if (!t) notFound();
  const canWish = wishlist !== null;
  const wished = wishlist?.some((w) => w.id === t.id) ?? false;

  const meta = TIER_META[t.tier];
  const counts = t.counts ?? {
    existing: t.mintedCount,
    circulating: t.circulatingCount,
    burned: t.mintedCount - t.circulatingCount,
    listed: 0,
  };
  const stat = (label: string, value: string) => (
    <div>
      <div className="font-display text-xl text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Temporada 1</span>
        <span>·</span>
        <span>{t.player.club}</span>
        <span>·</span>
        <span>edição</span>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
        <LanceCard template={t} live />

        <div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase"
            style={{ background: `${meta.color}26`, color: meta.color }}
          >
            {meta.label}
          </span>
          <h1 className="mt-2 font-display text-4xl uppercase text-ink">{t.player.name}</h1>
          <p className="text-muted">
            {t.title} · {t.playType} · {new Date(t.matchDate).toLocaleDateString('pt-BR')}
          </p>

          <div className="mt-4 font-mono text-2xl text-ink">{editionLabel(t)}</div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {stat('Preço médio (ASP)', brl(t.aspCents))}
            {stat('Competição', t.competition)}
            {stat('Posição', t.player.position)}
            {stat('Nacionalidade', t.player.nationality)}
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Propriedade
            </h2>
            <OwnershipStats
              existing={counts.existing}
              circulating={counts.circulating}
              burned={counts.burned}
              listed={counts.listed}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/pacotes"
              className="inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white"
            >
              Conseguir nos pacotes
            </Link>
            <WishlistButton templateId={t.id} canWish={canWish} initialWished={wished} />
          </div>
        </div>
      </div>
    </main>
  );
}
