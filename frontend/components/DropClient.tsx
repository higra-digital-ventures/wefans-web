'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buyDropPack, joinDrop, startDrop } from '@/lib/api-client';
import { brl } from '@/lib/format';
import type { DropDetail } from '@/lib/types';

export default function DropClient({
  drop,
  isAdmin,
  isAuthed,
}: {
  drop: DropDetail;
  isAdmin: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const buy = (packId: string) => {
    setError(null);
    start(async () => {
      try {
        const r = await buyDropPack(drop.id, packId);
        router.push(`/abrir/${r.inventoryId}`);
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  };

  const me = drop.myEntry;
  const primary = ' bg-accent px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50';
  const ghost = ' border border-line px-4 py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50';

  const buyButtons = (label: (p: { name: string; priceCents: number }) => string) => (
    <div className="flex flex-wrap gap-2">
      {drop.packs.map((p) => (
        <button key={p.id} className={primary} disabled={pending} onClick={() => buy(p.id)}>
          {label(p)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl space-y-3  border border-line bg-panel p-5">
      {error && <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      {drop.status === 'WAITING' || drop.status === 'SCHEDULED' ? (
        <>
          {!isAuthed ? (
            <p className="text-muted">Entre para participar do drop.</p>
          ) : !drop.eligible ? (
            <p className="text-amber-300">
              Score do Colecionador insuficiente (mínimo {drop.requiredCollectorScore}). Você tem{' '}
              {drop.collectorScore}.
            </p>
          ) : me ? (
            <p className="text-emerald-300">✓ Você está na sala de espera. Aguarde o início da fila.</p>
          ) : (
            <button className={primary} disabled={pending} onClick={() => run(() => joinDrop(drop.id))}>
              Entrar na sala de espera
            </button>
          )}
          {isAdmin && (
            <div>
              <button className={ghost} disabled={pending} onClick={() => run(() => startDrop(drop.id))}>
                Iniciar drop (gerar fila aleatória)
              </button>
            </div>
          )}
        </>
      ) : drop.status === 'LIVE' ? (
        !me ? (
          <p className="text-muted">A fila já foi sorteada — não é mais possível entrar.</p>
        ) : (
          <>
            <div className="text-sm text-muted">
              Sua posição na fila: <span className="font-display text-lg text-ink">#{me.position}</span>
            </div>
            {me.purchased ? (
              <p className="text-emerald-300">✓ Você já garantiu seu pacote neste drop.</p>
            ) : me.canBuyNow ? (
              <>
                <p className="text-emerald-300">Sua vez! Janela de compra aberta.</p>
                {buyButtons((p) => `Comprar ${p.name} · ${brl(p.priceCents)}`)}
              </>
            ) : me.canRebound ? (
              <>
                <p className="text-accent3">Sua janela passou — rebound disponível.</p>
                {buyButtons((p) => `Comprar no rebound · ${brl(p.priceCents)}`)}
              </>
            ) : (
              <p className="text-muted">Aguarde sua janela de compra (posição #{me.position}).</p>
            )}
          </>
        )
      ) : (
        <p className="text-muted">Drop encerrado.</p>
      )}
    </div>
  );
}
