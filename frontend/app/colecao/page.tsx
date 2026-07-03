import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCollectionServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import TierChips from '@/components/TierChips';
import { brl } from '@/lib/format';
import type { MomentDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ColecaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; all?: string }>;
}) {
  const { tier, all } = await searchParams;
  const moments = await getCollectionServer(tier ? `?tier=${tier}` : '');
  if (moments === null) redirect('/entrar');

  // agrupa duplicatas por edição (padrão); representante = menor serial
  const groups = new Map<string, MomentDTO[]>();
  for (const m of moments) {
    const g = groups.get(m.template.id);
    if (g) g.push(m);
    else groups.set(m.template.id, [m]);
  }
  const grouped = [...groups.values()].map((g) => [...g].sort((a, b) => a.serial - b.serial));
  const showAll = all === '1' || grouped.every((g) => g.length === 1);
  const hasDupes = grouped.some((g) => g.length > 1);
  // valor estimado = soma do preço médio (ASP) das edições que você possui
  const estimatedCents = moments.reduce((sum, m) => sum + (m.template.aspCents || 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl uppercase text-ink">Minha Coleção</h1>
        {estimatedCents > 0 && (
          <div className="text-right" title="Soma do preço médio de venda (ASP) de cada Lance seu — estimativa, não cotação">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted">Valor estimado ⓘ</div>
            <div className="font-display text-2xl text-accent3">{brl(estimatedCents)}</div>
          </div>
        )}
      </div>
      <p className="mb-6 text-muted">
        {moments.length} Lance{moments.length !== 1 ? 's' : ''} · {grouped.length} ediç
        {grouped.length !== 1 ? 'ões' : 'ão'}
        {hasDupes && (
          <>
            {' · '}
            <Link
              href={showAll && all === '1' ? (tier ? `/colecao?tier=${tier}` : '/colecao') : `/colecao?${tier ? `tier=${tier}&` : ''}all=1`}
              className="text-accent3 underline underline-offset-2 hover:text-ink"
            >
              {all === '1' ? 'agrupar duplicatas' : 'mostrar todos os exemplares'}
            </Link>
          </>
        )}
      </p>

      <TierChips basePath="/colecao" active={tier} />

      {moments.length === 0 ? (
        <div className="border border-line bg-panel p-8 text-center">
          <p className="mb-4 text-muted">Você ainda não tem Lances{tier ? ' deste tier' : ''}.</p>
          <Link href="/pacotes" className="bg-accent px-5 py-2.5 font-semibold text-white">
            Abrir um pacote
          </Link>
        </div>
      ) : showAll ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {moments.map((m) => (
            <LanceCard
              key={m.id}
              template={m.template}
              serial={m.serial}
              listingPriceCents={m.listingPriceCents}
              href={`/momento/${m.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {grouped.map((g) => {
            const m = g[0];
            return (
              <div key={m.template.id} className="relative">
                {g.length > 1 && (
                  <span
                    className="absolute left-2 top-2 z-10 bg-white px-1.5 py-0.5 text-[11px] font-bold text-black"
                    title={`Você tem ${g.length} exemplares desta edição (seriais ${g.map((x) => `#${x.serial}`).join(', ')})`}
                  >
                    ×{g.length}
                  </span>
                )}
                <LanceCard
                  template={m.template}
                  serial={m.serial}
                  listingPriceCents={m.listingPriceCents}
                  href={`/momento/${m.id}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
