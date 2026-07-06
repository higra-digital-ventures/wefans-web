'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { buyMoment } from '@/lib/api-client';
import { brl } from '@/lib/format';
import { useToast } from './Toaster';

// Compra rápida direto da grade (padrão Top Shot): o CTA do hover abre um
// mini-confirm no próprio card, sem carregar a página do Momento.
// Vive dentro de um <Link> — todo clique aqui bloqueia a navegação.
export default function QuickBuy({ listingId, priceCents }: { listingId: string; priceCents: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!confirming) {
    return (
      <button
        onClick={(e) => {
          stop(e);
          setConfirming(true);
        }}
        className="rounded-lg absolute inset-x-2 bottom-2 translate-y-2 bg-accent py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
      >
        Comprar · {brl(priceCents)}
      </button>
    );
  }

  return (
    <span
      onClick={stop}
      className="absolute inset-x-2 bottom-2 z-10 block border border-white/25 bg-black/95 p-2"
    >
      <span className="block text-center text-[11px] font-semibold text-white">
        Confirmar compra por {brl(priceCents)}?
      </span>
      <span className="mt-1.5 flex gap-1.5">
        <button
          disabled={pending}
          onClick={(e) => {
            stop(e);
            start(async () => {
              try {
                await buyMoment(listingId);
                toast('É seu! O Momento já está na sua coleção.', 'success');
                setConfirming(false);
                router.refresh();
              } catch (err) {
                const m = err instanceof Error ? err.message : 'Não deu para comprar.';
                if (/autenticad|401/i.test(m)) {
                  router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
                } else {
                  toast(m, 'error');
                  setConfirming(false);
                }
              }
            });
          }}
          className="rounded-lg flex-1 bg-accent py-1.5 text-[11px] font-bold uppercase text-white disabled:opacity-50"
        >
          {pending ? 'Comprando…' : 'Confirmar'}
        </button>
        <button
          disabled={pending}
          onClick={(e) => {
            stop(e);
            setConfirming(false);
          }}
          className="border border-white/25 px-2.5 text-[11px] font-bold uppercase text-neutral-300 hover:text-white"
        >
          ✕
        </button>
      </span>
    </span>
  );
}
