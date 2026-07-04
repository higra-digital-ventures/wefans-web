import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getTemplateMarketServer, getTemplateServer, getWishlistServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import OwnershipStats from '@/components/OwnershipStats';
import WishlistButton from '@/components/WishlistButton';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function LancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, wishlist, tm] = await Promise.all([
    getTemplateServer(id),
    getWishlistServer(),
    getTemplateMarketServer(id),
  ]);
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
      <Breadcrumbs items={[{ label: 'Mercado', href: '/mercado' }, { label: t.player.club, href: `/mercado?q=${encodeURIComponent(t.player.club)}` }, { label: t.player.name }]} />
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

          <div className="mt-4 tabular-nums text-2xl text-ink">{editionLabel(t)}</div>

          <div className="mt-6 grid grid-cols-3 gap-4  border border-line bg-panel p-4">
            {stat('Menor preço', tm?.floorCents != null ? brl(tm.floorCents) : '—')}
            {stat('Preço médio', brl(tm?.aspCents ?? t.aspCents))}
            {stat('À venda', String(tm?.activeListings ?? 0))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {stat('Competição', t.competition)}
            {stat('Posição', t.player.position)}
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
            {tm?.floorMomentId ? (
              <Link
                href={`/momento/${tm.floorMomentId}`}
                className="inline-block  bg-accent px-5 py-2.5 font-semibold text-white"
              >
                Comprar · {brl(tm.floorCents ?? 0)}
              </Link>
            ) : (
              <Link
                href="/pacotes"
                className="inline-block  bg-accent px-5 py-2.5 font-semibold text-white"
              >
                Conseguir nos pacotes
              </Link>
            )}
            <WishlistButton templateId={t.id} canWish={canWish} initialWished={wished} />
          </div>
        </div>
      </div>
    </main>
  );
}
