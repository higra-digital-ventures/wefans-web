'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api-client';
import type { PlatformConfig } from '@/lib/types';

// Editor das taxas de royalty (admin). Mostra/edita em %, salva em BPS.
export default function AdminRoyaltyConfig({ initial }: { initial: PlatformConfig }) {
  const router = useRouter();
  const [platform, setPlatform] = useState(initial.platformFeeBps / 100);
  const [club, setClub] = useState(initial.clubRoyaltyBps / 100);
  const [primary, setPrimary] = useState(initial.primaryClubBps / 100);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sellerNet = Math.max(0, 100 - platform - club).toFixed(club % 1 || platform % 1 ? 1 : 0);

  const field = (label: string, hint: string, val: number, set: (n: number) => void) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={val}
          onChange={(e) => set(Number(e.target.value))}
          className="rounded-lg w-24 border border-white/15 bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-white/40"
        />
        <span className="text-sm text-muted">%</span>
      </span>
      <span className="text-[10px] text-neutral-500">{hint}</span>
    </label>
  );

  function save() {
    setMsg(null);
    setErr(null);
    start(async () => {
      try {
        await adminPost('/admin/config', {
          platformFeeBps: Math.round(platform * 100),
          clubRoyaltyBps: Math.round(club * 100),
          primaryClubBps: Math.round(primary * 100),
        });
        setMsg('Taxas atualizadas.');
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-xl uppercase text-ink">Taxas de royalty</h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        Como o valor é dividido. Vale para novas vendas — o histórico já registrado não muda.
      </p>
      <div className="flex flex-wrap gap-5">
        {field('Plataforma (revenda)', 'taxa da plataforma na revenda', platform, setPlatform)}
        {field('Clube (revenda)', 'royalty do clube parceiro na revenda', club, setClub)}
        {field('Clube (pack)', 'parte do clube no valor do pack', primary, setPrimary)}
      </div>
      <p className="mt-3 text-[12px] text-neutral-400">
        Na revenda o vendedor recebe <span className="font-bold text-white">{sellerNet}%</span>. Sem clube parceiro
        no Momento, a parte do clube fica com a plataforma.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar taxas'}
        </button>
        {msg && <span className="text-[12px] text-emerald-300">{msg}</span>}
        {err && <span className="text-[12px] text-accent">{err}</span>}
      </div>
    </div>
  );
}
