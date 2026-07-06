import EmptyState from '@/components/EmptyState';
import { redirect } from 'next/navigation';
import { getMyOffersServer } from '@/lib/api-server';
import CancelOfferButton from '@/components/CancelOfferButton';
import { brl } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OfertasPage() {
  const offers = await getMyOffersServer();
  if (offers === null) redirect('/entrar');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Minhas Ofertas</h1>
      <p className="mb-6 text-muted">{offers.length} oferta(s) ativa(s)</p>
      {offers.length === 0 ? (
        <EmptyState
          title="Nenhuma oferta ativa"
          hint="Achou um Lance que quer? Faça uma oferta na página dele — o dono é avisado na hora."
          cta={{ label: 'Explorar o mercado', href: '/mercado' }}
        />
      ) : (
        <ul className="rounded-2xl divide-y divide-line  border border-line bg-panel">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-ink">
                  {o.template?.player.name ?? 'Lance'}{' '}
                  <span className="text-muted">
                    {o.scope === 'serial' && o.serial ? `#${o.serial}` : '· edição'}
                  </span>
                </div>
                <div className="truncate text-xs text-muted">{o.template?.title}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular-nums text-accent3">{brl(o.priceCents)}</span>
                <CancelOfferButton offerId={o.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
