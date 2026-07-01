'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  buyMoment,
  burnMoment,
  cancelListing,
  createListing,
  giftMoment,
  lockMoment,
  redeemMomentTicket,
} from '@/lib/api-client';
import { brl } from '@/lib/format';

// Ações do Momento (Fases 4–5): comprar/vender/cancelar + travar/queimar/presentear.
export default function MomentActions({
  momentId,
  listing,
  isOwner,
  isAuthed,
  isLocked,
  isBurned,
  lockedUntil,
  suggestedPriceCents,
}: {
  momentId: string;
  listing: { id: string; priceCents: number } | null;
  isOwner: boolean;
  isAuthed: boolean;
  isLocked: boolean;
  isBurned: boolean;
  lockedUntil: string | null;
  suggestedPriceCents: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(String(Math.max(1, Math.round(suggestedPriceCents / 100) || 1)));
  const [giftTo, setGiftTo] = useState('');

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

  const primary = 'rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50';
  const ghost = 'rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50';

  if (isBurned) {
    return <div className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">🔥 Este Lance foi queimado.</div>;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel p-5">
      {error && (
        <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>
      )}

      {listing ? (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">Menor preço</div>
          <div className="mb-3 font-display text-3xl text-ink">{brl(listing.priceCents)}</div>
          {isOwner ? (
            <button className={ghost} disabled={pending} onClick={() => run(() => cancelListing(listing.id))}>
              Cancelar venda
            </button>
          ) : (
            <button className={primary} disabled={pending} onClick={() => run(() => buyMoment(listing.id))}>
              {pending ? 'Comprando…' : 'Selecionar e comprar'}
            </button>
          )}
        </div>
      ) : isOwner && isLocked ? (
        <div className="text-sm text-amber-300">
          🔒 Travado até {lockedUntil ? new Date(lockedUntil).toLocaleDateString('pt-BR') : '—'}. Não pode
          vender, queimar ou presentear.
        </div>
      ) : isOwner ? (
        <>
          <div>
            <div className="mb-2 font-semibold text-ink">Vender</div>
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
              <button className={primary} disabled={pending} onClick={() => run(() => createListing(momentId, Math.round(Number(price) * 100)))}>
                Listar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button className={ghost} disabled={pending} onClick={() => run(() => lockMoment(momentId))}>
              🔒 Travar (1 ano)
            </button>
            <button
              className={ghost}
              disabled={pending}
              onClick={() => {
                if (confirm('Queimar é permanente. Continuar?')) run(() => burnMoment(momentId));
              }}
            >
              🔥 Queimar
            </button>
            <button
              className={ghost}
              disabled={pending}
              onClick={() => {
                if (confirm('Virar ficha queima o Lance em troca de 1 Ficha de Troca. Continuar?'))
                  run(() => redeemMomentTicket(momentId));
              }}
            >
              🎫 Virar ficha
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={giftTo}
              onChange={(e) => setGiftTo(e.target.value)}
              placeholder="usuário para presentear"
              className="flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-ink outline-none placeholder:text-muted/60"
            />
            <button className={ghost} disabled={pending || !giftTo} onClick={() => run(() => giftMoment(momentId, giftTo))}>
              🎁 Presentear
            </button>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted">
          {isAuthed ? 'Não está à venda — faça uma oferta abaixo.' : 'Entre para negociar este Lance.'}
        </div>
      )}
    </div>
  );
}
