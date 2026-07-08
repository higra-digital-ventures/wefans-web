import Icon from '@/components/Icon';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getFeedServer, getMarketServer, getMarketPulseServer, getChallengesServer, getWishlistServer, getMe } from '@/lib/api-server';
import MomentCard from '@/components/MomentCard';
import LoadMoreSentinel from '@/components/LoadMoreSentinel';
import MobileFilterSheet from '@/components/MobileFilterSheet';
import EmptyState from '@/components/EmptyState';
import PriceFilter from '@/components/PriceFilter';
import SortDropdown from '@/components/SortDropdown';
import SubTabs from '@/components/SubTabs';
import MoversPanel from '@/components/MoversPanel';
import TrendingStrip from '@/components/TrendingStrip';
import TacticalBoard from '@/components/TacticalBoard';
import VisCookie from '@/components/VisCookie';
import { brl } from '@/lib/format';
import { isFoil } from '@/lib/tiers';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

const SORTS = [
  { v: 'recent', label: 'RECENTES' },
  { v: 'price_asc', label: 'MENOR PREÇO' },
  { v: 'price_desc', label: 'MAIOR PREÇO' },
  { v: 'desconto', label: 'MAIOR DESCONTO' }, // % abaixo da média da edição (floor gap)
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
    pmin?: string; pmax?: string; deal?: string; ed?: string; n?: string; g?: string;
  }>;
}) {
  const { tier, sort, q, badge, vis, pmin, pmax, deal, ed, n, g } = await searchParams;
  // preferência de visualização lembrada: URL manda; sem URL, vale o cookie
  const cookieVis = (await cookies()).get('wf-vis')?.value;
  const effVis = vis ?? (cookieVis === 'list' || cookieVis === 'compact' ? cookieVis : undefined);
  const qs = new URLSearchParams();
  if (tier) qs.set('tier', tier);
  if (sort && API_SORTS.has(sort)) qs.set('sort', sort);
  const [allListings, challenges, me, myWishlist, feedPulse, pulse] = await Promise.all([
    getMarketServer(qs.toString() ? `?${qs}` : ''),
    getChallengesServer().catch(() => []),
    getMe(),
    getWishlistServer().catch(() => null),
    getFeedServer(1).catch(() => null), // só pelo popular.trending (termômetro)
    getMarketPulseServer().catch(() => null), // artilheiros do dia (matchSim)
  ]);
  const wishedIds = new Set((myWishlist ?? []).map((t) => t.id));
  // performance do dia → chip "N gols hoje" nos cards do jogador
  const hotByPlayer = new Map((pulse?.hot ?? []).map((h) => [h.playerId, `${h.gols} gols hoje`]));
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
  // maior desconto = mais % abaixo da média primeiro; sem média vai para o fim
  if (sort === 'desconto') {
    const gap = (l: (typeof listings)[number]) =>
      l.template.aspCents > 0 ? (l.priceCents - l.template.aspCents) / l.template.aspCents : Infinity;
    listings = [...listings].sort((a, b) => gap(a) - gap(b));
  }

  // paginação da grade: mostra `size` e cresce em passos de 24
  const size = Math.max(24, Number(n) || 24);
  const pageListings = listings.slice(0, size);

  // "Por edição": um card por template com o anúncio mais barato ("a partir de")
  const groupByEdition = g === '1' && effVis !== 'list';
  const editionGroups = (() => {
    if (!groupByEdition) return [];
    const map = new Map<string, { rep: (typeof listings)[number]; count: number }>();
    for (const l of listings) {
      const cur = map.get(l.template.id);
      if (!cur) map.set(l.template.id, { rep: l, count: 1 });
      else {
        cur.count += 1;
        if (l.priceCents < cur.rep.priceCents) cur.rep = l;
      }
    }
    return [...map.values()];
  })();
  const pageGroups = editionGroups.slice(0, size);

  const activeChallenges = challenges.filter((c) => c.active).slice(0, 12);
  // templates exigidos por desafios ativos (não completados) — demanda de utilidade
  const challengeWantedIds = new Set(
    challenges
      .filter((c) => c.active && !c.completed)
      .flatMap((c) => c.requiredTemplateIds ?? []),
  );

  // conversão quente: edições da SUA wishlist com anúncio ativo agora
  const wishOnSale = (() => {
    if (!me) return [];
    const byTemplate = new Map<
      string,
      { template: (typeof allListings)[number]['template']; minCents: number; momentId: string; count: number }
    >();
    for (const l of allListings) {
      if (!wishedIds.has(l.template.id) || l.seller === me.username) continue;
      const cur = byTemplate.get(l.template.id);
      if (!cur) byTemplate.set(l.template.id, { template: l.template, minCents: l.priceCents, momentId: l.momentId, count: 1 });
      else {
        cur.count += 1;
        if (l.priceCents < cur.minCents) {
          cur.minCents = l.priceCents;
          cur.momentId = l.momentId;
        }
      }
    }
    return [...byTemplate.values()].sort((a, b) => a.minCents - b.minCents).slice(0, 6);
  })();
  const dense = effVis === 'compact';
  const hasFilter = !!(tier || badge || q || pmin || pmax || deal || ed);

  // filtros ativos como chips removíveis (cada ✕ tira só aquele filtro)
  const activeFilters: { label: string; clear: Record<string, string | undefined> }[] = [];
  if (q) activeFilters.push({ label: `"${q}"`, clear: { q: undefined } });
  if (tier) activeFilters.push({ label: TIER_META[tier as keyof typeof TIER_META]?.label ?? tier, clear: { tier: undefined } });
  if (badgeChip) activeFilters.push({ label: badgeChip.label, clear: { badge: undefined } });
  if (pmin || pmax)
    activeFilters.push({
      label: `R$ ${pmin || '0'}–${pmax || '∞'}`,
      clear: { pmin: undefined, pmax: undefined },
    });
  if (deal) activeFilters.push({ label: 'Achados', clear: { deal: undefined } });
  if (ed) activeFilters.push({ label: ed === 'LE' ? 'Limitada' : 'Aberta', clear: { ed: undefined } });

  // monta hrefs preservando os demais parâmetros
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tier, sort, q, badge, vis, pmin, pmax, deal, ed, g, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/mercado${p.toString() ? `?${p}` : ''}`;
  };

  // grupos do sheet mobile (mesmos hrefs do rail desktop)
  const filterGroups = [
    {
      title: 'Raridade',
      options: TIER_ORDER.map((t) => ({
        label: TIER_META[t].label,
        href: href({ tier: tier === t ? undefined : t, n: undefined }),
        active: tier === t,
      })),
    },
    {
      title: 'Selos',
      options: BADGE_CHIPS.map((b) => ({
        label: b.label,
        href: href({ badge: badge === b.v ? undefined : b.v, n: undefined }),
        active: badge === b.v,
      })),
    },
    {
      title: 'Edição',
      options: [
        { label: 'Limitada', href: href({ ed: ed === 'LE' ? undefined : 'LE', n: undefined }), active: ed === 'LE' },
        { label: 'Aberta', href: href({ ed: ed === 'CC' ? undefined : 'CC', n: undefined }), active: ed === 'CC' },
      ],
    },
    {
      title: 'Oportunidade',
      options: [
        { label: 'Achados', href: href({ deal: deal ? undefined : '1', n: undefined }), active: !!deal },
        {
          label: 'Maior desconto',
          href: href({ sort: sort === 'desconto' ? undefined : 'desconto', n: undefined }),
          active: sort === 'desconto',
        },
      ],
    },
  ];

  // py maior no touch (alvo ≥40px); compacto no desktop
  const CHIP =
    'rounded-full border px-3 py-2.5 lg:py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors';

  return (
    <div className="bg-[#050505]">
    <main className="w-full px-4 py-7 lg:px-8">
      <VisCookie vis={vis} />
      <h1 className="mb-4 text-[40px] font-extrabold uppercase leading-none tracking-[0.01em] text-white">Marketplace</h1>

      <SubTabs
        items={[
          { label: 'Explorar', href: '/explorar' },
          { label: 'Momentos', href: '/mercado', active: true },
          { label: 'Pacotes', href: '/mercado/pacotes' },
          { label: 'Últimas vendas', href: '/mercado/atividade' },
          { label: 'Drops', href: '/drops' },
          { label: 'Minhas ofertas', href: '/ofertas' },
        ]}
      />

      {/* termômetro do mercado: Em alta (volume) + Movers (preço) */}
      {((feedPulse?.popular.trending?.length ?? 0) >= 2 || (pulse?.movers.length ?? 0) > 0) && (
        <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          {(feedPulse?.popular.trending?.length ?? 0) >= 2 ? (
            <TrendingStrip items={feedPulse!.popular.trending!} />
          ) : (
            <span aria-hidden />
          )}
          <MoversPanel movers={pulse?.movers ?? []} />
        </div>
      )}

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
                    className="rounded-2xl mt-2.5 flex items-center justify-center gap-1.5  border border-white/20 bg-[#141416] py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10"
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
        <span className="rounded-lg hidden w-12 shrink-0 items-center justify-center border border-white/15 text-white lg:flex" aria-hidden>
          <Icon name="sliders" size={18} />
        </span>
        <MobileFilterSheet groups={filterGroups} activeCount={activeFilters.length} clearHref="/mercado" />
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
            className="rounded-lg h-12 w-full  border border-white/15 bg-transparent pl-10 pr-3 text-sm text-white outline-none placeholder:text-neutral-400 focus:border-white/40"
          />
        </form>
        <PriceFilter pmin={pmin} pmax={pmax} />
        <SortDropdown options={SORTS} current={sort ?? 'recent'} />
      </div>

      {/* CLEAR + chips delineados + floor gap/densidade (segunda linha do print) */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/mercado"
          className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
            hasFilter ? 'border-white/50 text-white hover:bg-white/10' : 'border-white/15 text-neutral-500'
          }`}
        >
          Clear
        </Link>
        <Link
          href={href({ deal: deal ? undefined : '1' })}
          scroll={false}
          className={`${CHIP} ${deal ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-white/20 text-white hover:bg-white/10'}`}
          title="Anúncios abaixo do preço médio da edição"
        >
          Achados
        </Link>
        {TIER_ORDER.slice(0, 3).map((t) => (
          <Link
            key={t}
            href={href({ tier: tier === t ? undefined : t })}
            scroll={false}
            className={`${CHIP} ${tier === t ? 'border-white bg-white text-black' : 'border-white/20 text-white hover:bg-white/10'}`}
          >
            {TIER_META[t].label}s
          </Link>
        ))}
        {BADGE_CHIPS.map((b) => (
          <Link
            key={b.v}
            href={href({ badge: badge === b.v ? undefined : b.v })}
            scroll={false}
            className={`${CHIP} ${badge === b.v ? 'border-white bg-white text-black' : 'border-white/20 text-white hover:bg-white/10'}`}
          >
            {b.label}
          </Link>
        ))}
        {TIER_ORDER.slice(3).map((t) => (
          <Link
            key={t}
            href={href({ tier: tier === t ? undefined : t })}
            scroll={false}
            className={`${CHIP} ${tier === t ? 'border-white bg-white text-black' : 'border-white/20 text-white hover:bg-white/10'}`}
          >
            {TIER_META[t].label}s
          </Link>
        ))}

        <span className="ml-auto flex items-center gap-2">
          <Link
            href={href({ g: g ? undefined : '1', n: undefined })}
            scroll={false}
            title="Um card por edição, com o menor preço"
            className={`rounded-lg flex items-center gap-2 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
              groupByEdition
                ? 'border-white bg-white text-black'
                : 'border-white/15 text-neutral-400 hover:border-white/40 hover:text-white'
            }`}
          >
            Por edição
          </Link>
          <Link
            href={href({ sort: sort === 'desconto' ? undefined : 'desconto', n: undefined })}
            scroll={false}
            title="Ordenar pelos anúncios mais abaixo da média da edição"
            className={`rounded-lg flex items-center gap-2 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
              sort === 'desconto'
                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                : 'border-white/15 text-neutral-400 hover:border-white/40 hover:text-white'
            }`}
          >
            Maior desconto
            <Icon name="trendUp" size={12} className="-scale-y-100" />
          </Link>
          <Link
            href={href({ vis: 'grid' })}
            scroll={false}
            aria-label="Grade confortável"
            title="Grade confortável"
            className={`rounded-lg flex h-9 w-9 items-center justify-center border ${!dense && effVis !== 'list' ? 'border-white/50 text-white' : 'border-white/15 text-neutral-500 hover:text-white'}`}
          >
            <Icon name="grid" size={16} />
          </Link>
          <Link
            href={href({ vis: 'list' })}
            scroll={false}
            aria-label="Modo lista"
            title="Modo lista"
            className={`rounded-lg flex h-9 w-9 items-center justify-center border ${effVis === 'list' ? 'border-white/50 text-white' : 'border-white/15 text-neutral-500 hover:text-white'}`}
          >
            <Icon name="list" size={16} />
          </Link>
          <Link
            href={href({ vis: 'compact' })}
            scroll={false}
            aria-label="Grade densa"
            title="Grade densa"
            className={`rounded-lg flex h-9 w-9 items-center justify-center border ${dense ? 'border-white/50 text-white' : 'border-white/15 text-neutral-500 hover:text-white'}`}
          >
            <Icon name="gridDense" size={16} />
          </Link>
        </span>
      </div>

      {/* orientação: quantos sobraram e o que está filtrando (✕ remove um por um) */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-bold tabular-nums text-white">
          {groupByEdition ? `${editionGroups.length} edições · ${listings.length} anúncios` : `${listings.length} à venda`}
        </span>
        {activeFilters.map((fl) => (
          <Link
            key={fl.label}
            href={href({ ...fl.clear, n: undefined })}
            scroll={false}
            title={`Remover filtro: ${fl.label}`}
            className="rounded-full flex items-center gap-1.5 border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-neutral-200 transition-colors hover:border-white/40 hover:text-white"
          >
            {fl.label}
            <Icon name="close" size={10} />
          </Link>
        ))}
        {activeFilters.length > 1 && (
          <Link href="/mercado" className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-white">
            limpar tudo
          </Link>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        {/* rail de filtros sticky (só desktop; no mobile os chips acima cobrem) */}
        <aside className="hidden lg:block lg:self-start lg:sticky lg:top-[88px]">
          <div className="rounded-2xl space-y-5 border border-white/10 bg-[#0a0a0b] p-4">
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
                  { v: 'CC', label: 'Aberta' },
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
              <Link href="/mercado" className="rounded-lg block border border-white/15 py-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:bg-white/10">
                Limpar filtros
              </Link>
            )}
          </div>
        </aside>

        <div>
          {/* da sua wishlist, à venda agora — nudge discreto no topo dos resultados */}
          {wishOnSale.length > 0 && (
            <section className="rounded-2xl mb-4 border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent3">
                <Icon name="bookmark" filled size={13} />
                Da sua wishlist, à venda agora
              </div>
              <div className="scrollbar-none -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
                {wishOnSale.map(({ template: t, minCents, count }) => {
                  const m = TIER_META[t.tier];
                  return (
                    <Link
                      key={t.id}
                      href={`/moment/${t.id}`}
                      className="rounded-2xl w-[128px] shrink-0 border border-white/10 bg-[#08080a] p-2 transition-colors hover:border-accent3/50"
                    >
                      <div className="mx-auto w-[80%]">
                        <div className="aspect-[4/5] overflow-hidden rounded-lg border" style={{ borderColor: `${m.color}66` }}>
                          <TacticalBoard trajectory={t.trajectory} jersey={t.player.jersey} color={m.color} foil={isFoil(t.tier)} />
                        </div>
                      </div>
                      <div className="mt-1.5 truncate text-[11px] font-bold text-white">{t.player.name}</div>
                      <div className="flex items-baseline justify-between text-[10px]">
                        <span className="font-bold tabular-nums text-white">{brl(minCents)}</span>
                        <span className="tabular-nums text-neutral-500">
                          {count > 1 ? `${count} à venda` : 'só 1'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          {listings.length === 0 ? (
            <EmptyState
              title="Nada à venda com esse filtro"
              hint="Afrouxe os filtros ou marque edições na wishlist para ser avisado quando listarem."
              cta={{ label: 'Limpar filtros', href: '/mercado' }}
            />
          ) : effVis === 'list' ? (
            <>
            {/* cabeçalho de colunas (tela de trader) */}
            <div className="rounded-t-2xl flex items-center gap-4 border border-b-0 border-white/10 bg-[#101012] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-500">
              <span className="w-11 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">Momento</span>
              <span className="hidden w-14 text-right sm:block">Edição</span>
              <span className="hidden w-20 text-right md:block">Média</span>
              <span className="hidden w-14 text-right sm:block" title="diferença do preço para a média">
                Δ%
              </span>
              <span className="w-24 text-right">Preço</span>
            </div>
            <ul className="rounded-b-2xl overflow-hidden divide-y divide-white/[0.06] border border-white/10 bg-[#0a0a0b]">
              {pageListings.map((l) => {
                const m = TIER_META[l.template.tier];
                return (
                  <li key={l.listingId}>
                    <Link
                      href={`/moment/${l.template.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/5"
                    >
                      <span className="h-14 w-11 shrink-0 overflow-hidden rounded-md border" style={{ borderColor: `${m.color}66` }} aria-hidden>
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
                      <span className="hidden w-14 text-right text-[11px] tabular-nums text-neutral-500 sm:block">
                        {l.template.editionType === 'LIMITADA' ? `/${l.template.editionSize}` : 'Aberta'}
                      </span>
                      <span className="hidden w-20 text-right text-[12px] tabular-nums text-neutral-400 md:block">
                        {l.template.aspCents > 0 ? brl(l.template.aspCents) : '—'}
                      </span>
                      {(() => {
                        const d =
                          l.template.aspCents > 0
                            ? Math.round(((l.priceCents - l.template.aspCents) / l.template.aspCents) * 100)
                            : null;
                        return (
                          <span
                            className={`hidden w-14 text-right text-[12px] font-bold tabular-nums sm:block ${
                              d == null ? 'text-neutral-600' : d < 0 ? 'text-emerald-400' : d > 0 ? 'text-red-400' : 'text-neutral-500'
                            }`}
                          >
                            {d == null ? '—' : `${d > 0 ? '+' : ''}${d}%`}
                          </span>
                        );
                      })()}
                      <span className="w-24 shrink-0 text-right">
                        <span className="block text-[15px] font-bold tabular-nums text-white">{brl(l.priceCents)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">comprar →</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            </>
          ) : (
            <div
              className={
                dense
                  ? 'grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]'
                  : 'grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]'
              }
            >
              {(groupByEdition ? pageGroups : pageListings.map((l) => ({ rep: l, count: 1 }))).map(
                ({ rep: l, count }) => (
                  <div key={l.listingId} className="relative">
                    {groupByEdition && count > 1 && (
                      <span
                        className="absolute left-2 top-2 z-10 bg-white px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-black"
                        title={`${count} anúncios desta edição — mostrando o mais barato`}
                      >
                        {count} à venda
                      </span>
                    )}
                    <MomentCard
                      template={l.template}
                      serial={l.serial}
                      priceCents={l.priceCents}
                      quickBuyListingId={me && l.seller !== me.username ? l.listingId : undefined}
                      hotLabel={hotByPlayer.get(l.template.player.id)}
                      challengeWanted={challengeWantedIds.has(l.template.id)}
                      href={`/moment/${l.template.id}`}
                      wishlist={{ wished: wishedIds.has(l.template.id), canWish: !!me }}
                    />
                  </div>
                ),
              )}
            </div>
          )}
          {(groupByEdition ? editionGroups.length : listings.length) > size && (
            <>
            <LoadMoreSentinel href={href({ n: String(size + 24) })} />
            <Link
              href={href({ n: String(size + 24) })}
              scroll={false}
              className="rounded-lg mt-4 block border border-white/15 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Carregar mais ({(groupByEdition ? editionGroups.length : listings.length) - size} restantes)
            </Link>
            </>
          )}
        </div>
      </div>
    </main>
    </div>
  );
}
