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

// Painel de compra/ações no padrão do Top Shot (seção 11.12d): CTA cheio em caps,
// ações secundárias em botões retangulares discretos.
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

  const cta =
    'w-full rounded bg-accent py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90 disabled:opacity-50';
  const ctaWhite =
    'w-full rounded bg-white py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition-opacity hover:opacity-90 disabled:opacity-50';
  const ghost =
    'rounded border border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-[#3a2b52] hover:text-ink disabled:opacity-50';

  if (isBurned) {
    return (
      <div className="rounded-lg border border-line bg-[#0c0813] p-4 text-sm text-muted">
        Este Lance foi queimado — fora de circulação.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-[#0c0813] p-4">
      {error && (
        <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">{error}</p>
      )}

      {listing ? (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">Menor preço</div>
              <div className="font-display text-3xl text-ink">{brl(listing.priceCents)}</div>
            </div>
          </div>
          {isOwner ? (
            <button className={ctaWhite} disabled={pending} onClick={() => run(() => cancelListing(listing.id))}>
              {pending ? '…' : 'Cancelar venda'}
            </button>
          ) : (
            <button className={cta} disabled={pending} onClick={() => run(() => buyMoment(listing.id))}>
              {pending ? 'Comprando…' : 'Selecionar e comprar'}
            </button>
          )}
        </>
      ) : isOwner && isLocked ? (
        <div className="text-sm text-amber-300">
          Travado até {lockedUntil ? new Date(lockedUntil).toLocaleDateString('pt-BR') : '—'} — não pode
          ser vendido, queimado ou presenteado.
        </div>
      ) : isOwner ? (
        <>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded border border-line bg-panel2 px-3">
              <span className="text-sm text-muted">R$</span>
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-transparent px-2 py-2.5 text-ink outline-none"
                aria-label="Preço de venda em reais"
              />
            </div>
            <button
              className="rounded bg-accent px-6 text-[13px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
              disabled={pending}
              onClick={() => run(() => createListing(momentId, Math.round(Number(price) * 100)))}
            >
              Listar
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
            <button className={ghost} disabled={pending} onClick={() => run(() => lockMoment(momentId))}>
              Travar · 1 ano
            </button>
            <button
              className={ghost}
              disabled={pending}
              onClick={() => {
                if (confirm('Queimar é permanente. Continuar?')) run(() => burnMoment(momentId));
              }}
            >
              Queimar
            </button>
            <button
              className={ghost}
              disabled={pending}
              onClick={() => {
                if (confirm('Virar ficha queima o Lance em troca de 1 Ficha de Troca. Continuar?'))
                  run(() => redeemMomentTicket(momentId));
              }}
            >
              Virar ficha
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              value={giftTo}
              onChange={(e) => setGiftTo(e.target.value)}
              placeholder="usuário para presentear"
              className="min-w-0 flex-1 rounded border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60"
            />
            <button className={ghost} disabled={pending || !giftTo} onClick={() => run(() => giftMoment(momentId, giftTo))}>
              Presentear
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
