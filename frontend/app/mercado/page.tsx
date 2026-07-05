import Icon from '@/components/Icon';
import Link from 'next/link';
import { getMarketServer, getChallengesServer, getWishlistServer, getMe } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import EmptyState from '@/components/EmptyState';
import PriceFilter from '@/components/PriceFilter';
import SortDropdown from '@/components/SortDropdown';
import SubTabs from '@/components/SubTabs';
import TacticalBoard from '@/components/TacticalBoard';
import { brl } from '@/lib/format';
import { isFoil } from '@/lib/tiers';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

const SORTS = [
  { v: 'recent', label: 'RECENTES' },
  { v: 'price_asc', label: 'MENOR PREÇO' },
  { v: 'price_desc', label: 'MAIOR PREÇO' },
  { v: 'serial_asc', label: 'MENOR SERIAL' }, // low serial = prestígio (ordenado no front)
];
const API_SORTS = new Set(['recent', 'price_asc', 'price_desc']);

// chips rápidos no padrão do Top Shot (Ultimates · Legendaries · Rares · Debut…)
const BADGE_CHIPS = [
  { v: 'estreia', label: 'Estreias', match: 'Estreia' },
  { v: 'hat-trick', label: 'Hat-tricks', match: 'Hat-trick' },
];

// artes do carrossel "Colecione e Ganhe" (gradientes da marca, um por card)
const EARN_ART = [
  'linear-gradient(135deg,#ff2e88,#3a1e6e)',
  'linear-gradient(135deg,#21d4e0,#0e3a6e)',
  'linear-gradient(135deg,#9d4edd,#1a0b2e)',
  'linear-gradient(135deg,#ff9e2c,#6e1e3a)',
  'linear-gradient(135deg,#ff2e88,#9d4edd)',
  'linear-gradient(135deg,#21d4e0,#9d4edd)',
];

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: Promise<{
    tier?: string; sort?: string; q?: string; badge?: string; vis?: string;
    pmin?: string; pmax?: string; deal?: string; ed?: string; n?: string;
  }>;
}) {
  const { tier, sort, q, badge, vis, pmin, pmax, deal, ed, n } = await searchParams;
  const qs = new URLSearchParams();
  if (tier) qs.set('tier', tier);
  if (sort && API_SORTS.has(sort)) qs.set('sort', sort);
  const [allListings, challenges, me, myWishlist] = await Promise.all([
    getMarketServer(qs.toString() ? `?${qs}` : ''),
    getChallengesServer().catch(() => []),
    getMe(),
    getWishlistServer().catch(() => null),
  ]);
  const wishedIds = new Set((myWishlist ?? []).map((t) => t.id));
  let listings = allListings;
  if (q) {
    const needle = q.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.template.player.name.toLowerCase().includes(needle) ||
        l.template.title.toLowerCase().includes(needle) ||
        l.template.player.club.toLowerCase().includes(needle),
    );
  }
  const badgeChip = BADGE_CHIPS.find((b) => b.v === badge);
  if (badgeChip) {
    listings = listings.filter((l) => l.template.badges.includes(badgeChip.match));
  }
  // faixa de preço (em reais) e "Achados" (abaixo do preço médio da edição)
  const min = pmin ? Number(pmin) * 100 : null;
  const max = pmax ? Number(pmax) * 100 : null;
  if (min != null && !Number.isNaN(min)) listings = listings.filter((l) => l.priceCents >= min);
  if (max != null && !Number.isNaN(max)) listings = listings.filter((l) => l.priceCents <= max);
  if (deal) listings = listings.filter((l) => l.template.aspCents > 0 && l.priceCents < l.template.aspCents);
  if (ed === 'LE') listings = listings.filter((l) => l.template.editionType === 'LIMITADA');
  if (ed === 'CC') listings = listings.filter((l) => l.template.editionType === 'CIRCULANTE');
  if (sort === 'serial_asc') listings = [...listings].sort((a, b) => a.serial - b.serial);

  // paginação da grade: mostra `size` e cresce em passos de 24
  const size = Math.max(24, Number(n) || 24);
  const pageListings = listings.slice(0, size);

  const activeChallenges = challenges.filter((c) => c.active).slice(0, 12);
  const dense = vis === 'compact';
  const hasFilter = !!(tier || badge || q || pmin || pmax || deal || ed);

  // monta hrefs preservando os demais parâmetros
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tier, sort, q, badge, vis, pmin, pmax, deal, ed, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/mercado${p.toString() ? `?${p}` : ''}`;
  };

  // py maior no touch (alvo ≥40px); compacto no desktop
  const CHIP =
    'rounded-full border px-3 py-2.5 lg:py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors';

  return (
    <div className="bg-[#050505]">
    <main className="w-full px-4 py-7 lg:px-8">
      <h1 className="mb-4 text-[40px] font-extrabold uppercase leading-none tracking-[0.01em] text-white">Marketplace</h1>

      <SubTabs
        items={[
          { label: 'Explore', href: '/explorar' },
          { label: 'Lances', href: '/mercado', active: true },
          { label: 'Packs', href: '/mercado/pacotes' },
          { label: 'Últimas vendas', href: '/mercado/atividade' },
          { label: 'Drops', href: '/drops' },
          { label: 'Minhas ofertas', href: '/ofertas' },
        ]}
      />

      {/* Colecione e Ganhe — campanhas (desafios ativos), como o "Collect and Earn" */}
      {activeChallenges.length > 0 && (
        <section className="mb-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold text-white">Complete o álbum ⌃</h2>
            <Link
              href="/jogar/desafios"
              className="text-[11px] text-neutral-300 underline underline-offset-2 hover:text-white"
            >
              Como funcionam as recompensas
            </Link>
          </div>
          <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {activeChallenges.map((c, i) => (
              <div
                key={c.id}
                className="w-[184px] shrink-0  bg-[#1b1b1d] p-1.5"
              >
                <div
                  className="flex h-[172px] items-center justify-center overflow-hidden  p-3"
                  style={{ background: EARN_ART[i % EARN_ART.length] }}
                >
                  <span className="text-center font-display text-[24px] uppercase leading-[1.02] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.7)]">
                    {c.name}
                  </span>
                </div>
                <div className="px-1.5 pb-1.5 pt-2">
                  <div className="truncate text-[13px] font-bold text-white">{c.name}</div>
                  <div className="mt-1 truncate text-[11px] text-neutral-400">
                    {c.progress ? (
                      <>
                        <span className="font-bold text-white">
                          {c.progress.have}/{c.progress.need}
                        </span>{' '}
                        no álbum
                      </>
                    ) : c.burnOnComplete ? (
                      'bata figurinha e ganhe'
                    ) : (
                      'valendo hoje'
                    )}
                  </div>
                  {c.progress && (
                    <div className="mt-1.5 h-1 bg-white/10" aria-hidden>
                      <div
                        className="h-1 bg-accent3"
                        style={{ width: `${Math.min(100, (c.progress.have / c.progress.need) * 100)}%` }}
                      />
                    </div>
                  )}
                  <Link
                    href={`/jogar/desafios/${c.id}`}
                    className="mt-2.5 flex items-center justify-center gap-1.5  border border-white/20 bg-[#141416] py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Icon name="market" size={14} />
                    {c.completed ? 'Fechado!' : c.burnOnComplete ? 'Trocar' : 'Completar'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* barra de filtros delineada (bordas brancas), como no print do Top Shot */}
      <div className="mb-2.5 flex flex-wrap items-stretch gap-2.5">
        <span className="flex w-12 shrink-0 items-center justify-center  border border-white/60 text-white" aria-hidden>
          <Icon name="sliders" size={18} />
        </span>
        <form action="/mercado" className="relative min-w-[260px] flex-1">
          {tier && <input type="hidden" name="tier" value={tier} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          {badge && <input type="hidden" name="badge" value={badge} />}
          {vis && <input type="hidden" name="vis" value={vis} />}
          {pmin && <input type="hidden" name="pmin" value={pmin} />}
          {pmax && <input type="hidden" name="pmax" value={pmax} />}
          {deal && <input type="hidden" name="deal" value={deal} />}
          <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Busque por jogadores, times e sets"
            className="h-12 w-full  border border-white/60 bg-transparent pl-10 pr-3 text-sm text-white outline-none placeholder:text-neutral-400 focus:border-white"
          />
        </form>
        <PriceFilter pmin={pmin} pmax={pmax} />
        <SortDropdown options={SORTS} current={sort ?? 'recent'} />
      </div>

      {/* CLEAR + chips delineados + floor gap/densidade (segunda linha do print) */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/mercado"
          className={` border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
            hasFilter ? 'border-white text-white hover:bg-white/10' : 'border-white/25 text-neutral-500'
          }`}
        >
          Clear
        </Link>
        <Link
          href={href({ deal: deal ? undefined : '1' })}
          scroll={false}
          className={`${CHIP} ${deal ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-white/40 text-white hover:bg-white/10'}`}
          title="Anúncios abaixo do preço médio da edição"
        >
          Achados
        </Link>
        {TIER_ORDER.slice(0, 3).map((t) => (
          <Link
            key={t}
            href={href({ tier: tier === t ? undefined : t })}
            scroll={false}
            className={`${CHIP} ${tier === t ? 'border-white bg-white text-black' : 'border-white/40 text-white hover:bg-white/10'}`}
          >
            {TIER_META[t].label}s
          </Link>
        ))}
        {BADGE_CHIPS.map((b) => (
          <Link
            key={b.v}
            href={href({ badge: badge === b.v ? undefined : b.v })}
            scroll={false}
            className={`${CHIP} ${badge === b.v ? 'border-white bg-white text-black' : 'border-white/40 text-white hover:bg-white/10'}`}
          >
            {b.label}
          </Link>
        ))}
        {TIER_ORDER.slice(3).map((t) => (
          <Link
            key={t}
            href={href({ tier: tier === t ? undefined : t })}
            scroll={false}
            className={`${CHIP} ${tier === t ? 'border-white bg-white text-black' : 'border-white/40 text-white hover:bg-white/10'}`}
          >
            {TIER_META[t].label}s
          </Link>
        ))}

        <span className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-2  border border-white/25 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500"
            title="Em breve"
          >
            Floor gap
            <Icon name="chevronDown" size={12} />
          </span>
          <Link
            href={href({ vis: undefined })}
            scroll={false}
            aria-label="Grade confortável"
            title="Grade confortável"
            className={`flex h-9 w-9 items-center justify-center  border ${!dense ? 'border-white text-white' : 'border-white/30 text-neutral-500 hover:text-white'}`}
          >
            <Icon name="grid" size={16} />
          </Link>
          <Link
            href={href({ vis: 'list' })}
            scroll={false}
            aria-label="Modo lista"
            title="Modo lista"
            className={`flex h-9 w-9 items-center justify-center border ${vis === 'list' ? 'border-white text-white' : 'border-white/30 text-neutral-500 hover:text-white'}`}
          >
            <Icon name="list" size={16} />
          </Link>
          <Link
            href={href({ vis: 'compact' })}
            scroll={false}
            aria-label="Grade densa"
            title="Grade densa"
            className={`flex h-9 w-9 items-center justify-center  border ${dense ? 'border-white text-white' : 'border-white/30 text-neutral-500 hover:text-white'}`}
          >
            <Icon name="gridDense" size={16} />
          </Link>
        </span>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        {/* rail de filtros sticky (só desktop; no mobile os chips acima cobrem) */}
        <aside className="hidden lg:block lg:self-start lg:sticky lg:top-[88px]">
          <div className="space-y-5 border border-white/10 bg-[#0a0a0b] p-4">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Raridade</div>
              <div className="space-y-1">
                {TIER_ORDER.map((t) => (
                  <Link
                    key={t}
                    href={href({ tier: tier === t ? undefined : t, n: undefined })}
                    className={`flex items-center gap-2 px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                      tier === t ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_META[t].color }} aria-hidden />
                    {TIER_META[t].label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Selos</div>
              <div className="space-y-1">
                {BADGE_CHIPS.map((b) => (
                  <Link
                    key={b.v}
                    href={href({ badge: badge === b.v ? undefined : b.v, n: undefined })}
                    className={`block px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                      badge === b.v ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Edição</div>
              <div className="space-y-1">
                {[
                  { v: 'LE', label: 'Limitada (LE)' },
                  { v: 'CC', label: 'Circulante (CC)' },
                ].map((o) => (
                  <Link
                    key={o.v}
                    href={href({ ed: ed === o.v ? undefined : o.v, n: undefined })}
                    className={`block px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                      ed === o.v ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>
            {hasFilter && (
              <Link href="/mercado" className="block border border-white/25 py-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:bg-white/10">
                Limpar filtros
              </Link>
            )}
          </div>
        </aside>

        <div>
          {listings.length === 0 ? (
            <EmptyState
              title="Nada à venda com esse filtro"
              hint="Afrouxe os filtros ou marque edições na wishlist para ser avisado quando listarem."
              cta={{ label: 'Limpar filtros', href: '/mercado' }}
            />
          ) : vis === 'list' ? (
            <ul className="divide-y divide-white/[0.06] border border-white/10 bg-[#0a0a0b]">
              {pageListings.map((l) => {
                const m = TIER_META[l.template.tier];
                return (
                  <li key={l.listingId}>
                    <Link
                      href={`/momento/${l.momentId}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/5"
                    >
                      <span className="h-14 w-11 shrink-0 overflow-hidden border" style={{ borderColor: `${m.color}66` }} aria-hidden>
                        <TacticalBoard trajectory={l.template.trajectory} jersey={l.template.player.jersey} color={m.color} foil={isFoil(l.template.tier)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-white">
                          {l.template.player.name} <span className="tabular-nums font-normal text-neutral-500">#{l.serial}</span>
                        </span>
                        <span className="block truncate text-[11px] text-neutral-400">
                          <span style={{ color: m.color }}>{m.label}</span> · {l.template.title}
                        </span>
                      </span>
                      <span className="hidden text-[11px] text-neutral-500 sm:block">
                        {l.template.editionType === 'LIMITADA' ? `/${l.template.editionSize}` : 'CC'}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[15px] font-bold tabular-nums text-white">{brl(l.priceCents)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-accent3">comprar →</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className={
                dense
                  ? 'grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]'
                  : 'grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]'
              }
            >
              {pageListings.map((l) => (
                <LanceCard
                  key={l.listingId}
                  template={l.template}
                  serial={l.serial}
                  priceCents={l.priceCents}
                  quickBuyListingId={me && l.seller !== me.username ? l.listingId : undefined}
                  href={`/momento/${l.momentId}`}
                  wishlist={{ wished: wishedIds.has(l.template.id), canWish: !!me }}
                />
              ))}
            </div>
          )}
          {listings.length > size && (
            <Link
              href={href({ n: String(size + 24) })}
              scroll={false}
              className="mt-4 block border border-white/15 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Carregar mais ({listings.length - size} restantes)
            </Link>
          )}
        </div>
      </div>
    </main>
    </div>
  );
}
