import Link from 'next/link';
import { getMarketServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import TierChips from '@/components/TierChips';

export const dynamic = 'force-dynamic';

const SORTS = [
  { v: 'recent', label: 'Recentes' },
  { v: 'price_asc', label: 'Menor preço' },
  { v: 'price_desc', label: 'Maior preço' },
];

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; sort?: string }>;
}) {
  const { tier, sort } = await searchParams;
  const qs = new URLSearchParams();
  if (tier) qs.set('tier', tier);
  if (sort) qs.set('sort', sort);
  const listings = await getMarketServer(qs.toString() ? `?${qs}` : '');

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-4xl uppercase text-ink">Mercado</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/mercado/pacotes" className="text-accent3 hover:underline">
            pacotes lacrados →
          </Link>
          <Link href="/mercado/atividade" className="text-accent3 hover:underline">
            vendas ao vivo →
          </Link>
        </div>
      </div>
      <p className="mb-6 text-muted">{listings.length} Lances à venda</p>

      <TierChips basePath="/mercado" active={tier} />

      <div className="mb-6 flex gap-4 text-sm">
        {SORTS.map((s) => {
          const q = new URLSearchParams();
          if (tier) q.set('tier', tier);
          if (s.v !== 'recent') q.set('sort', s.v);
          const active = (sort ?? 'recent') === s.v;
          return (
            <Link
              key={s.v}
              href={`/mercado${q.toString() ? `?${q}` : ''}`}
              className={active ? 'text-ink' : 'text-muted hover:text-ink'}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {listings.length === 0 ? (
        <p className="text-muted">Nada à venda com esse filtro.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
