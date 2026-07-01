'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buyMoment, cancelListing, createListing } from '@/lib/api-client';
import { brl } from '@/lib/format';

// Ações do Mercado no detalhe do Momento (Fase 4): comprar / vender / cancelar.
// Ofertas, travar, queimar e presentear entram na Fase 5.
export default function MomentActions({
  momentId,
  listing,
  isOwner,
  isAuthed,
  suggestedPriceCents,
}: {
  momentId: string;
  listing: { id: string; priceCents: number } | null;
  isOwner: boolean;
  isAuthed: boolean;
  suggestedPriceCents: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(String(Math.max(1, Math.round(suggestedPriceCents / 100) || 1)));

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push('/entrar');
        else setError(m);
      }
    });
  };

  const btn = 'rounded-lg px-5 py-2.5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      {error && (
        <p className="mb-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {listing ? (
        <>
          <div className="text-xs uppercase tracking-widest text-muted">Menor preço</div>
          <div className="mb-4 font-display text-3xl text-ink">{brl(listing.priceCents)}</div>
          {isOwner ? (
            <button
              className={`${btn} border border-line text-muted`}
              disabled={pending}
              onClick={() => run(() => cancelListing(listing.id))}
            >
              {pending ? '…' : 'Cancelar venda'}
            </button>
          ) : (
            <button
              className={`${btn} bg-accent text-white`}
              disabled={pending}
              onClick={() => run(() => buyMoment(listing.id))}
            >
              {pending ? 'Comprando…' : 'Selecionar e comprar'}
            </button>
          )}
        </>
      ) : isOwner ? (
        <>
          <div className="mb-2 font-semibold text-ink">Vender este Lance</div>
          <div className="flex gap-2">
            <div className="flex items-center rounded-lg border border-line bg-panel2 px-3">
              <span className="text-muted">R$</span>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-24 bg-transparent px-2 py-2 text-ink outline-none"
              />
            </div>
            <button
              className={`${btn} bg-accent text-white`}
              disabled={pending}
              onClick={() => run(() => createListing(momentId, Math.round(Number(price) * 100)))}
            >
              {pending ? '…' : 'Listar'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted">
          {isAuthed ? 'Este Lance não está à venda.' : 'Entre para negociar este Lance.'}
        </div>
      )}
    </div>
  );
}
