'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { buyPack } from '@/lib/api-client';
import { brl } from '@/lib/format';
import { useToast } from '@/components/Toaster';

export default function BuyPackButton({
  packId,
  priceCents,
  soldOut,
}: {
  packId: string;
  priceCents: number;
  soldOut?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const free = priceCents === 0;

  function onBuy(e: MouseEvent) {
    // vive dentro do card (Link) — o clique aqui não navega pro detalhe
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    start(async () => {
      try {
        const r = await buyPack(packId);
        toast(free ? 'Pacote resgatado! Rasgando…' : 'Pacote comprado! Rasgando…', 'success');
        router.push(`/abrir/${r.inventoryId}?auto=1`);
        router.refresh(); // atualiza o saldo na top bar (layout persistente)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(msg)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else {
          setError(msg);
          toast(msg, 'error');
        }
      }
    });
  }

  return (
    <div>
      <button
        onClick={onBuy}
        disabled={pending || soldOut}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {soldOut
          ? 'Esgotado'
          : pending
            ? free
              ? 'Resgatando…'
              : 'Comprando…'
            : free
              ? 'Resgatar grátis'
              : `Comprar · ${brl(priceCents)}`}
      </button>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
