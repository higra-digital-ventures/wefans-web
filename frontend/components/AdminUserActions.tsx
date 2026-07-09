'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api-client';

// Ações admin por usuário: suspender/reativar e ajustar saldo de teste.
export default function AdminUserActions({
  id,
  suspended,
  isAdmin,
}: {
  id: string;
  suspended: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erro');
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => {
            const v = prompt('Ajustar saldo em R$ (use negativo para debitar):', '0');
            if (v == null) return;
            const reais = Number(v.replace(',', '.'));
            if (!reais) return;
            run(() => adminPost(`/admin/users/${id}/balance`, { deltaCents: Math.round(reais * 100), memo: 'Ajuste admin' }));
          }}
          className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-ink disabled:opacity-50"
        >
          Ajustar saldo
        </button>
        {!isAdmin && (
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(suspended ? 'Reativar esta conta?' : 'Suspender esta conta (bloqueia login)?')) return;
              run(() => adminPost(`/admin/users/${id}/suspend`, { suspended: !suspended }));
            }}
            className={`rounded-lg px-2.5 py-1 text-xs disabled:opacity-50 ${
              suspended ? 'bg-emerald-500/15 text-emerald-300' : 'border border-accent/50 text-accent'
            }`}
          >
            {suspended ? 'Reativar' : 'Suspender'}
          </button>
        )}
      </span>
      {err && <span className="text-[10px] text-accent">{err}</span>}
    </span>
  );
}
