'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
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
import { useToast } from '@/components/Toaster';

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
  balanceCents = null,
  aspCents = 0,
}: {
  momentId: string;
  listing: { id: string; priceCents: number } | null;
  isOwner: boolean;
  isAuthed: boolean;
  isLocked: boolean;
  isBurned: boolean;
  lockedUntil: string | null;
  suggestedPriceCents: number;
  balanceCents?: number | null; // saldo do usuário p/ resumo de compra (null = deslogado)
  aspCents?: number; // preço médio da edição (p/ aviso de preço anômalo)
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [armed, setArmed] = useState<null | 'lock' | 'burn' | 'ticket'>(null); // ação destrutiva aguardando confirmação
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
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  };

  const cta =
    'w-full  bg-accent py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90 disabled:opacity-50';
  const ctaWhite =
    'w-full  bg-white py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition-opacity hover:opacity-90 disabled:opacity-50';
  const ghost =
    ' border border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-[#3a2b52] hover:text-ink disabled:opacity-50';

  if (isBurned) {
    return (
      <div className="border border-line bg-[#0e0e10] p-4 text-sm text-muted">
        Este Lance foi queimado — fora de circulação.
      </div>
    );
  }

  return (
    <div className="space-y-3  border border-line bg-[#0e0e10] p-4">
      {error && (
        <p className="border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">{error}</p>
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
          ) : balanceCents != null && balanceCents < listing.priceCents ? (
            <div>
              <button className={cta} disabled title="Seu saldo não cobre este preço">
                Saldo insuficiente
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Saldo: {brl(balanceCents)} ·{' '}
                <Link href="/perfil" className="text-accent3 underline underline-offset-2">
                  depositar na carteira
                </Link>
              </p>
            </div>
          ) : confirming ? (
            <div className="border border-line bg-panel2 p-3">
              <p className="text-sm text-ink">Confirmar compra por {brl(listing.priceCents)}?</p>
              {aspCents > 0 && listing.priceCents > 3 * aspCents && (
                <p className="mt-1.5 border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-200">
                  Atenção: preço {Math.round(listing.priceCents / aspCents)}× acima da média da
                  edição ({brl(aspCents)}). Compras muito acima da média são sinalizadas para revisão.
                </p>
              )}
              {balanceCents != null && (
                <p className="mt-0.5 text-xs text-muted">
                  Saldo após a compra: {brl(balanceCents - listing.priceCents)}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  className={cta}
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await buyMoment(listing.id);
                      setConfirming(false);
                      toast('É seu! O Lance já está na sua coleção.', 'success');
                    })
                  }
                >
                  {pending ? 'Comprando…' : 'Confirmar compra'}
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
          ) : (
            <button className={cta} disabled={pending} onClick={() => setConfirming(true)}>
              Selecionar e comprar
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
            <div className="flex flex-1 items-center  border border-line bg-panel2 px-3">
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
              className="bg-accent px-6 text-[13px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
              disabled={pending}
              onClick={() => run(() => createListing(momentId, Math.round(Number(price) * 100)))}
            >
              Listar
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
            <button className={ghost} disabled={pending} onClick={() => setArmed(armed === 'lock' ? null : 'lock')}>
              Travar · 1 ano
            </button>
            <button className={ghost} disabled={pending} onClick={() => setArmed(armed === 'burn' ? null : 'burn')}>
              Queimar
            </button>
            <button className={ghost} disabled={pending} onClick={() => setArmed(armed === 'ticket' ? null : 'ticket')}>
              Virar ficha
            </button>
          </div>

          {/* confirmação inline com a consequência escrita (nada de confirm() do navegador) */}
          {armed && (
            <div className="border border-amber-400/40 bg-amber-400/5 p-3">
              <p className="text-xs leading-relaxed text-amber-200">
                {armed === 'lock' &&
                  'Travar por 1 ano: este Lance não poderá ser vendido, queimado, presenteado nem usado em troca até lá. Ele continua seu e segue pontuando.'}
                {armed === 'burn' &&
                  'Queimar destrói este exemplar para sempre e reduz a circulação da edição. Não há como desfazer — e você não recebe nada em troca (para ganhar ficha, use "Virar ficha").'}
                {armed === 'ticket' &&
                  'Virar ficha queima este Lance em troca de 1 Ficha de Troca. Fichas compram pacotes exclusivos na página Fichas.'}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  className="bg-amber-400 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black disabled:opacity-50"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      if (armed === 'lock') {
                        await lockMoment(momentId);
                        toast('Lance travado por 1 ano.', 'success');
                      } else if (armed === 'burn') {
                        await burnMoment(momentId);
                        toast('Exemplar queimado — fora de circulação.', 'info');
                      } else {
                        await redeemMomentTicket(momentId);
                        toast('Você ganhou 1 Ficha de Troca.', 'success');
                      }
                      setArmed(null);
                    })
                  }
                >
                  {pending ? '…' : armed === 'lock' ? 'Confirmar trava' : armed === 'burn' ? 'Confirmar queima' : 'Confirmar troca'}
                </button>
                <button
                  className="border border-line px-4 text-[11px] font-bold uppercase text-muted hover:text-ink"
                  disabled={pending}
                  onClick={() => setArmed(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-1.5">
            <input
              value={giftTo}
              onChange={(e) => setGiftTo(e.target.value)}
              placeholder="usuário para presentear"
              className="min-w-0 flex-1  border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60"
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
