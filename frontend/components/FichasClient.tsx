'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redeemTicketsForPack } from '@/lib/api-client';
import { TIER_META } from '@/lib/tiers';
import type { TicketPack, Tier } from '@/lib/types';

export default function FichasClient({
  packs,
  tradeTickets,
}: {
  packs: TicketPack[];
  tradeTickets: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function redeem(packId: string) {
    setError(null);
    start(async () => {
      try {
        const r = await redeemTicketsForPack(packId);
        router.push(`/abrir/${r.inventoryId}`);
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push('/entrar');
        else setError(m);
      }
    });
  }

  return (
    <div>
      <div className="mb-6  border border-line bg-panel p-5">
        <div className="font-display text-3xl text-ink">{tradeTickets}</div>
        <div className="text-sm text-muted">Fichas de Troca disponíveis</div>
        <p className="mt-2 text-xs text-muted">Troque um Lance por 1 ficha na página do Lance (queima o Lance).</p>
      </div>

      {error && <p className="mb-4  border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      {packs.length === 0 ? (
        <p className="text-muted">Nenhum pacote exclusivo disponível.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packs.map((p) => (
            <div key={p.id} className="border border-line bg-panel p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-xl text-ink">{p.name}</span>
                <span className="rounded-full bg-panel2 px-2 py-1 text-xs text-accent3">🎫 {p.ticketCost} fichas</span>
              </div>
              <p className="text-xs text-muted">{p.momentCount} Lances</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(p.oddsJson).map(([tier, prob]) => {
                  const meta = TIER_META[tier as Tier];
                  return (
                    <span key={tier} className="px-1.5 py-0.5 text-[10px]" style={{ background: `${meta.color}22`, color: meta.color }}>
                      {meta.label} {(prob * 100).toFixed(prob * 100 < 1 ? 1 : 0)}%
                    </span>
                  );
                })}
              </div>
              <button
                onClick={() => redeem(p.id)}
                disabled={pending || tradeTickets < p.ticketCost}
                className="mt-4  bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {tradeTickets < p.ticketCost ? 'Fichas insuficientes' : 'Trocar fichas'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
