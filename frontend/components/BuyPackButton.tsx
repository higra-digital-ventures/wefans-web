'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buyPack } from '@/lib/api-client';
import { brl } from '@/lib/format';

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
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onBuy() {
    setError(null);
    start(async () => {
      try {
        const r = await buyPack(packId);
        router.push(`/abrir/${r.inventoryId}`);
        router.refresh(); // atualiza o saldo na top bar (layout persistente)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(msg)) router.push('/entrar');
        else setError(msg);
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
        {soldOut ? 'Esgotado' : pending ? 'Comprando…' : `Comprar · ${brl(priceCents)}`}
      </button>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
