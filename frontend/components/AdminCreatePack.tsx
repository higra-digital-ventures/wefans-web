'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api-client';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';
import type { AdminSet, AdminDrop, Tier } from '@/lib/types';

// Monta um pack: preço, nº de Momentos, supply, odds por tier, garantia, Set e
// (opcional) drop. Odds em % (salvas como fração). Sem drop = Loja 24/7.
export default function AdminCreatePack({ sets, drops }: { sets: AdminSet[]; drops: AdminDrop[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: '',
    price: '20',
    momentCount: '3',
    totalSupply: '1000',
    guarantee: '' as '' | Tier,
    setId: sets[0]?.id ?? '',
    dropId: '',
    sealed: true,
    ticketOnly: false,
  });
  // odds em % por tier
  const [odds, setOdds] = useState<Record<Tier, string>>({
    COMUM: '60',
    TORCIDA: '20',
    RARO: '15',
    LENDARIO: '4.5',
    GALACTICO: '0.5',
  });
  const oddsSum = TIER_ORDER.reduce((s, t) => s + (Number(odds[t]) || 0), 0);
  const ok = f.name && f.setId && Number(f.momentCount) >= 1 && Number(f.totalSupply) >= 1 && oddsSum > 0;
  const field = 'rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-white/40';

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Novo pack</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 lg:col-span-3">
          <span className="text-[11px] uppercase tracking-wide text-muted">Nome</span>
          <input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Pack Golaços da Rodada" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Preço (R$)</span>
          <input type="number" min={0} step={1} className={field} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Momentos por pack</span>
          <input type="number" min={1} max={40} className={field} value={f.momentCount} onChange={(e) => setF({ ...f, momentCount: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Supply total</span>
          <input type="number" min={1} className={field} value={f.totalSupply} onChange={(e) => setF({ ...f, totalSupply: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Coleção (Set)</span>
          <select className={field} value={f.setId} onChange={(e) => setF({ ...f, setId: e.target.value })}>
            {sets.length === 0 && <option value="">—</option>}
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.seriesName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Drop (opcional)</span>
          <select className={field} value={f.dropId} onChange={(e) => setF({ ...f, dropId: e.target.value })}>
            <option value="">— Loja 24/7 (sem drop)</option>
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Garantia mínima</span>
          <select className={field} value={f.guarantee} onChange={(e) => setF({ ...f, guarantee: e.target.value as '' | Tier })}>
            <option value="">— sem garantia</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIER_META[t].label}+
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-[11px] uppercase tracking-wide text-muted">
          <span>Odds (%)</span>
          <span className={oddsSum === 100 ? 'text-emerald-300' : 'text-amber-300'}>soma {oddsSum}%</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TIER_ORDER.map((t) => (
            <label key={t} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: TIER_META[t].color }}>
                {TIER_META[t].label}
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                className={field}
                value={odds[t]}
                onChange={(e) => setOdds({ ...odds, [t]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-5">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.sealed} onChange={(e) => setF({ ...f, sealed: e.target.checked })} />
          <span className="text-sm text-ink">Revendível lacrado</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.ticketOnly} onChange={(e) => setF({ ...f, ticketOnly: e.target.checked })} />
          <span className="text-sm text-ink">Só com Fichas de Troca</span>
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
      <button
        disabled={!ok || pending}
        className="rounded-lg mt-3 bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => {
          setError(null);
          start(async () => {
            try {
              const oddsFrac: Record<string, number> = {};
              for (const t of TIER_ORDER) {
                const v = Number(odds[t]) || 0;
                if (v > 0) oddsFrac[t] = v / 100;
              }
              await adminPost('/admin/packs', {
                name: f.name,
                priceCents: Math.round(Number(f.price) * 100),
                momentCount: Number(f.momentCount),
                totalSupply: Number(f.totalSupply),
                guaranteeTier: f.guarantee || null,
                odds: oddsFrac,
                setId: f.setId || null,
                dropId: f.dropId || null,
                sealed: f.sealed,
                ticketOnly: f.ticketOnly,
              });
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erro');
            }
          });
        }}
      >
        {pending ? 'Criando…' : 'Criar pack'}
      </button>
    </div>
  );
}
