import { getMarketServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import SubTabs from '@/components/SubTabs';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

const SORTS = [
  { v: 'recent', label: 'RECENTES' },
  { v: 'price_asc', label: 'MENOR PREÇO' },
  { v: 'price_desc', label: 'MAIOR PREÇO' },
];

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; sort?: string; q?: string }>;
}) {
  const { tier, sort, q } = await searchParams;
  const qs = new URLSearchParams();
  if (tier) qs.set('tier', tier);
  if (sort) qs.set('sort', sort);
  let listings = await getMarketServer(qs.toString() ? `?${qs}` : '');
  if (q) {
    const needle = q.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.template.player.name.toLowerCase().includes(needle) ||
        l.template.title.toLowerCase().includes(needle) ||
        l.template.player.club.toLowerCase().includes(needle),
    );
  }

  const chipHref = (t?: string) => {
    const p = new URLSearchParams();
    if (t) p.set('tier', t);
    if (sort) p.set('sort', sort);
    if (q) p.set('q', q);
    return `/mercado${p.toString() ? `?${p}` : ''}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="mb-4 font-display text-4xl uppercase tracking-tight text-ink">Mercado</h1>

      <SubTabs
        items={[
          { label: 'Explorar', href: '/explorar' },
          { label: 'Moments', href: '/mercado', active: true },
          { label: 'Pacotes', href: '/pacotes' },
          { label: 'Pacotes lacrados', href: '/mercado/pacotes' },
          { label: 'Últimas vendas', href: '/mercado/atividade' },
          { label: 'Minhas ofertas', href: '/ofertas' },
        ]}
      />

      {/* barra de filtros: busca + chips rápidos + ordenação */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form action="/mercado" className="relative min-w-[220px] flex-1">
          {tier && <input type="hidden" name="tier" value={tier} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-muted" aria-hidden>
            <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
          </svg>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Busque por jogadores, times e lances"
            className="w-full rounded border border-line bg-[#0c0813] py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent/50"
          />
        </form>
        <form action="/mercado" className="contents">
          {tier && <input type="hidden" name="tier" value={tier} />}
          {q && <input type="hidden" name="q" value={q} />}
          <select
            name="sort"
            defaultValue={sort ?? 'recent'}
            className="rounded border border-line bg-[#0c0813] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="rounded border border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted hover:text-ink">
            Aplicar
          </button>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <a
          href={chipHref()}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${!tier ? 'border-ink bg-ink text-black' : 'border-line text-muted hover:text-ink'}`}
        >
          Todos
        </a>
        {TIER_ORDER.map((t) => (
          <a
            key={t}
            href={chipHref(t)}
            className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors"
            style={
              tier === t
                ? { borderColor: TIER_META[t].color, color: TIER_META[t].color, background: `${TIER_META[t].color}14` }
                : { borderColor: 'var(--line)', color: 'var(--muted)' }
            }
          >
            {TIER_META[t].label}s
          </a>
        ))}
        <span className="ml-auto text-[11px] text-muted">{listings.length} à venda</span>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-10 text-center text-sm text-muted">
          Nada à venda com esse filtro.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
  );
}
