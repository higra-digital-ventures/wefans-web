import Icon from '@/components/Icon';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getTemplateCollectorsServer, getTemplateMarketServer, getTemplateServer, getWishlistServer } from '@/lib/api-server';
import MomentCard from '@/components/MomentCard';
import OwnershipStats from '@/components/OwnershipStats';
import WishlistButton from '@/components/WishlistButton';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemplateServer(id);
  if (!t) return { title: 'Momento' };
  return {
    title: `${t.player.name} — ${t.title}`,
    description: `${t.playType} · ${t.competition} · edição ${t.editionType === 'LIMITADA' ? `limitada /${t.editionSize}` : 'circulante'} no wefans.`,
  };
}

export default async function LancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, wishlist, collectors, tm] = await Promise.all([
    getTemplateServer(id),
    getWishlistServer(),
    getTemplateCollectorsServer(id),
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
        <span>Brasileirão 2025</span>
        <span>·</span>
        <span>{t.player.club}</span>
        <span>·</span>
        <span>edição</span>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
        <MomentCard template={t} live />

        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase"
              style={{ background: `${meta.color}26`, color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Edição
            </span>
          </div>
          <h1 className="mt-2 font-display text-4xl uppercase text-ink">{t.player.name}</h1>
          <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Todos os Momentos desta edição
          </p>
          <p className="text-muted">
            {t.title} · {t.playType} · {new Date(t.matchDate).toLocaleDateString('pt-BR')}
          </p>

          <div className="mt-4 tabular-nums text-2xl text-ink">{editionLabel(t)}</div>

          {/* cerimônia de encerramento: supply congelado é argumento de valorização */}
          {t.emissionClosed && (
            <div className="mt-3 inline-flex items-center gap-2 border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300">
              <Icon name="lock" size={13} />
              Emissão encerrada · supply congelado em {t.circulatingCount.toLocaleString('pt-BR')}
            </div>
          )}

          <div className="rounded-2xl mt-6 grid grid-cols-3 gap-4  border border-line bg-panel p-4">
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
                className="rounded-lg inline-block  bg-accent px-5 py-2.5 font-semibold text-white"
              >
                Comprar · {brl(tm.floorCents ?? 0)}
              </Link>
            ) : (
              <Link
                href="/pacotes"
                className="rounded-lg inline-block  bg-accent px-5 py-2.5 font-semibold text-white"
              >
                Conseguir nos pacotes
              </Link>
            )}
            <WishlistButton templateId={t.id} canWish={canWish} initialWished={wished} />
          </div>
        </div>
      </div>

      {/* todos os exemplares: serial → dono (como "ver todos os Moments da edição") */}
      {collectors && collectors.serials.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-2xl uppercase tracking-tight text-ink">
            Exemplares da edição
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {collectors.serials.map((m) => (
              <li key={m.serial}>
                <Link
                  href={`/momento/${m.momentId}`}
                  className="rounded-2xl flex items-center gap-3 border border-white/10 bg-[#0a0a0b] px-3 py-2 transition-colors hover:border-white/30"
                >
                  <span className="tabular-nums text-[13px] font-bold text-accent3">#{m.serial}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-300">
                    {m.burned ? (
                      <span className="text-neutral-500">destruído</span>
                    ) : m.owner ? (
                      `@${m.owner}`
                    ) : (
                      '—'
                    )}
                  </span>
                  {m.listedCents != null && (
                    <span className="shrink-0 text-[11px] font-bold text-emerald-300">
                      à venda · {brl(m.listedCents)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
