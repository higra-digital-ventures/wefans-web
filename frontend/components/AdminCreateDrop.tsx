'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api-client';

// Cria um drop AGENDADO. O cron abre a sala/inicia/encerra sozinho nos horários.
export default function AdminCreateDrop() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: '', waiting: '', starts: '', ends: '', score: '0', rebound: true });
  const [error, setError] = useState<string | null>(null);
  const ok = f.name && f.waiting && f.starts && f.ends;
  const field = 'rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-white/40';
  const iso = (v: string) => new Date(v).toISOString();

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Novo drop (agendado)</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] uppercase tracking-wide text-muted">Nome</span>
          <input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Drop Golaços — Rodada 25" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Sala de espera abre</span>
          <input type="datetime-local" className={field} value={f.waiting} onChange={(e) => setF({ ...f, waiting: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Início (compra)</span>
          <input type="datetime-local" className={field} value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Fim</span>
          <input type="datetime-local" className={field} value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Score do Colecionador mín.</span>
          <input type="number" min={0} className={field} value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={f.rebound} onChange={(e) => setF({ ...f, rebound: e.target.checked })} />
          <span className="text-sm text-ink">Com repescagem (rebound)</span>
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
              await adminPost('/admin/drops', {
                name: f.name,
                waitingRoomOpensAt: iso(f.waiting),
                startsAt: iso(f.starts),
                endsAt: iso(f.ends),
                requiredCollectorScore: Number(f.score) || 0,
                hasRebound: f.rebound,
              });
              setF({ name: '', waiting: '', starts: '', ends: '', score: '0', rebound: true });
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erro');
            }
          });
        }}
      >
        {pending ? 'Criando…' : 'Criar drop (agendado)'}
      </button>
    </div>
  );
}
