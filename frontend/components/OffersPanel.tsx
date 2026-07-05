'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptOffer, makeOffer } from '@/lib/api-client';
import { brl } from '@/lib/format';
import { useToast } from '@/components/Toaster';
import type { OfferForMoment } from '@/lib/types';

const OFFER_TTL_DAYS = 7; // validade padrão da oferta

export default function OffersPanel({
  momentId,
  isOwner,
  isAuthed,
  offers,
  balanceCents = null,
  bare = false,
}: {
  momentId: string;
  isOwner: boolean;
  isAuthed: boolean;
  offers: OfferForMoment[];
  balanceCents?: number | null; // p/ resumo de confirmação
  bare?: boolean; // sem card/título próprios (embutido num Panel)
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        setPrice('');
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  };

  return (
    <div className={bare ? '' : 'mt-6  border border-line bg-panel p-5'}>
      {!bare && <h2 className="mb-3 font-semibold text-ink">Ofertas</h2>}

      {!isOwner && isAuthed && (
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="flex items-center  border border-line bg-panel2 px-3">
              <span className="text-muted">R$</span>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setConfirming(false);
                }}
                className="w-24 bg-transparent px-2 py-2 text-ink outline-none"
                placeholder="0"
              />
            </div>
            <button
              className="border border-white/40 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              disabled={pending || !price}
              onClick={() => setConfirming(true)}
            >
              Fazer oferta
            </button>
          </div>

          {/* resumo de confirmação: valor, saldo e validade antes de enviar */}
          {confirming && price && (
            <div className="mt-2 border border-line bg-panel2 p-3">
              <p className="text-sm text-ink">
                Oferecer <span className="font-bold">{brl(Math.round(Number(price) * 100))}</span> por este Lance?
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Validade: {OFFER_TTL_DAYS} dias · o valor só sai do saldo se o dono aceitar
                {balanceCents != null && <> · seu saldo: {brl(balanceCents)}</>}
              </p>
              {balanceCents != null && balanceCents < Math.round(Number(price) * 100) && (
                <p className="mt-1 border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">
                  Seu saldo hoje não cobre a oferta — deposite antes de o dono aceitar.
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  className="bg-accent px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await makeOffer({
                        momentId,
                        priceCents: Math.round(Number(price) * 100),
                        expiresAt: new Date(Date.now() + OFFER_TTL_DAYS * 86_400_000).toISOString(),
                      });
                      setConfirming(false);
                      toast('Oferta enviada — o dono foi avisado.', 'success');
                    })
                  }
                >
                  {pending ? 'Enviando…' : 'Confirmar oferta'}
                </button>
                <button
                  className="border border-line px-4 text-[12px] font-bold uppercase text-muted hover:text-ink"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {offers.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma oferta ainda.</p>
      ) : (
        <ul className="divide-y divide-line">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <span className="tabular-nums text-accent3">{brl(o.priceCents)}</span>
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
