'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptOffer, makeOffer } from '@/lib/api-client';
import { brl } from '@/lib/format';
import type { OfferForMoment } from '@/lib/types';

export default function OffersPanel({
  momentId,
  isOwner,
  isAuthed,
  offers,
  bare = false,
}: {
  momentId: string;
  isOwner: boolean;
  isAuthed: boolean;
  offers: OfferForMoment[];
  bare?: boolean; // sem card/título próprios (embutido num Panel)
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState('');

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        setPrice('');
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push('/entrar');
        else setError(m);
      }
    });
  };

  return (
    <div className={bare ? '' : 'mt-6  border border-line bg-panel p-5'}>
      {!bare && <h2 className="mb-3 font-semibold text-ink">Ofertas</h2>}

      {!isOwner && isAuthed && (
        <div className="mb-4 flex gap-2">
          <div className="flex items-center  border border-line bg-panel2 px-3">
            <span className="text-muted">R$</span>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-24 bg-transparent px-2 py-2 text-ink outline-none"
              placeholder="0"
            />
          </div>
          <button
            className="bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={pending || !price}
            onClick={() => run(() => makeOffer({ momentId, priceCents: Math.round(Number(price) * 100) }))}
          >
            Fazer oferta
          </button>
        </div>
      )}

      {offers.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma oferta ainda.</p>
      ) : (
        <ul className="divide-y divide-line">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <span className="font-mono text-accent3">{brl(o.priceCents)}</span>
                <span className="text-muted">
                  {' '}
                  · @{o.buyer} · {o.scope === 'serial' ? 'neste serial' : 'na edição'}
                </span>
              </div>
              {isOwner && (
                <button
                  className="bg-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={pending}
                  onClick={() => run(() => acceptOffer(o.id, momentId))}
                >
                  Aceitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-sm text-accent">{error}</p>}
    </div>
  );
}
