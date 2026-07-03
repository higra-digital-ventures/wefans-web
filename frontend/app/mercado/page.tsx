import Link from 'next/link';
import { getMarketServer, getChallengesServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import SubTabs from '@/components/SubTabs';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

const SORTS = [
  { v: 'recent', label: 'RECENTES' },
  { v: 'price_asc', label: 'MENOR PREÇO' },
  { v: 'price_desc', label: 'MAIOR PREÇO' },
];

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
  searchParams: Promise<{ tier?: string; sort?: string; q?: string; badge?: string; vis?: string }>;
}) {
  const { tier, sort, q, badge, vis } = await searchParams;
  const qs = new URLSearchParams();
  if (tier) qs.set('tier', tier);
  if (sort) qs.set('sort', sort);
  const [allListings, challenges] = await Promise.all([
    getMarketServer(qs.toString() ? `?${qs}` : ''),
    getChallengesServer().catch(() => []),
  ]);
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

  const activeChallenges = challenges.filter((c) => c.active).slice(0, 12);
  const dense = vis === 'compact';
  const hasFilter = !!(tier || badge || q);

  // monta hrefs preservando os demais parâmetros
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tier, sort, q, badge, vis, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/mercado${p.toString() ? `?${p}` : ''}`;
  };

  const CHIP = 'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors';

  return (
    <div className="bg-[#050505]">
    <main className="w-full px-4 py-7 lg:px-8">
      <h1 className="mb-4 text-[40px] font-extrabold uppercase leading-none tracking-[0.01em] text-white">Marketplace</h1>

      <SubTabs
        items={[
          { label: 'Explore', href: '/explorar' },
          { label: 'Moments', href: '/mercado', active: true },
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
            <h2 className="text-[15px] font-bold text-white">Colecione e Ganhe ⌃</h2>
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
                        para coletar
                      </>
                    ) : c.burnOnComplete ? (
                      'forje para ganhar'
                    ) : (
                      'para colecionar'
                    )}
                  </div>
                  <Link
                    href={`/jogar/desafios/${c.id}`}
                    className="mt-2.5 flex items-center justify-center gap-1.5  border border-white/20 bg-[#141416] py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                      <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 2h3l.6 3H22l-2.4 8.5a2 2 0 0 1-1.9 1.5H8.1a2 2 0 0 1-2-1.6L4.2 4H3V2Zm4 5 1.2 6h10l1.7-6H7Z" />
                    </svg>
                    {c.completed ? 'Concluído' : c.burnOnComplete ? 'Forjar' : 'Coletar'}
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
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
            <path d="M6 3h2v6H6V3Zm0 10h2v8H6v-8Zm-2-3h6v2H4v-2Zm7-7h2v3h-2V3Zm0 7h2v11h-2V10ZM9 7h6v2H9V7Zm7-4h2v11h-2V3Zm-2 12h6v2h-6v-2Zm2 3h2v3h-2v-3Z" />
          </svg>
        </span>
        <form action="/mercado" className="relative min-w-[260px] flex-1">
          {tier && <input type="hidden" name="tier" value={tier} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          {badge && <input type="hidden" name="badge" value={badge} />}
          {vis && <input type="hidden" name="vis" value={vis} />}
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-neutral-400" aria-hidden>
            <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
          </svg>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Busque por jogadores, times e sets"
            className="h-12 w-full  border border-white/60 bg-transparent pl-10 pr-3 text-sm text-white outline-none placeholder:text-neutral-400 focus:border-white"
          />
        </form>
        <form action="/mercado" className="flex items-stretch gap-2.5">
          {tier && <input type="hidden" name="tier" value={tier} />}
          {q && <input type="hidden" name="q" value={q} />}
          {badge && <input type="hidden" name="badge" value={badge} />}
          {vis && <input type="hidden" name="vis" value={vis} />}
          <select
            name="sort"
            defaultValue={sort ?? 'recent'}
            className="border border-white/60 bg-black px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white outline-none focus:border-white"
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-2  border border-white/60 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
              <path d="M3 6h10v2H3V6Zm0 5h7v2H3v-2Zm0 5h4v2H3v-2Zm14-9v9.2l-2.6-2.6L13 15l5 5 5-5-1.4-1.4-2.6 2.6V7h-2Z" />
            </svg>
            Desc
          </button>
        </form>
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
        {TIER_ORDER.slice(0, 3).map((t) => (
          <Link
            key={t}
            href={href({ tier: tier === t ? undefined : t })}
            className={`${CHIP} ${tier === t ? 'border-white bg-white text-black' : 'border-white/40 text-white hover:bg-white/10'}`}
          >
            {TIER_META[t].label}s
          </Link>
        ))}
        {BADGE_CHIPS.map((b) => (
          <Link
            key={b.v}
            href={href({ badge: badge === b.v ? undefined : b.v })}
            className={`${CHIP} ${badge === b.v ? 'border-white bg-white text-black' : 'border-white/40 text-white hover:bg-white/10'}`}
          >
            {b.label}
          </Link>
        ))}
        {TIER_ORDER.slice(3).map((t) => (
          <Link
            key={t}
            href={href({ tier: tier === t ? undefined : t })}
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
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
              <path d="m12 15-5-5h10l-5 5Z" />
            </svg>
          </span>
          <Link
            href={href({ vis: undefined })}
            aria-label="Grade confortável"
            className={`flex h-9 w-9 items-center justify-center  border ${!dense ? 'border-white text-white' : 'border-white/30 text-neutral-500 hover:text-white'}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2v14a7 7 0 0 1 0-14Z" />
            </svg>
          </Link>
          <Link
            href={href({ vis: 'compact' })}
            aria-label="Grade densa"
            className={`flex h-9 w-9 items-center justify-center  border ${dense ? 'border-white text-white' : 'border-white/30 text-neutral-500 hover:text-white'}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M3 3h18v18H3V3Zm2 2v3.5h6.5V5H5Zm8.5 0v3.5H19V5h-5.5ZM5 10.5V14h6.5v-3.5H5Zm8.5 0V14H19v-3.5h-5.5ZM5 16v3h6.5v-3H5Zm8.5 0v3H19v-3h-5.5Z" />
            </svg>
          </Link>
        </span>
      </div>

      {listings.length === 0 ? (
        <div className="border border-white/10 bg-[#0a0a0a] p-10 text-center text-sm text-neutral-400">
          Nada à venda com esse filtro.
        </div>
      ) : (
        <div
          // auto-fill: a resolução decide quantas colunas cabem (como no Top Shot)
          className={
            dense
              ? 'grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]'
              : 'grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]'
          }
        >
          {listings.map((l) => (
            <LanceCard
              key={l.listingId}
              template={l.template}
              serial={l.serial}
              priceCents={l.priceCents}
              href={`/momento/${l.momentId}`}
            />
          ))}
        </div>
      )}
    </main>
    </div>
  );
}
