'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitChallenge } from '@/lib/api-client';
import type { ChallengeDetail } from '@/lib/types';

// Montador de Entrada (Challenge Builder, seção 11.9).
export default function ChallengeBuilder({
  challenge,
  isAuthed,
}: {
  challenge: ChallengeDetail;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Record<string, string>>({}); // templateId -> momentId
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ grantedPackInventoryId?: string; rewardMomentId?: string } | null>(null);

  const allCovered = challenge.required.length > 0 && challenge.required.every((r) => selected[r.template.id]);

  function submit() {
    setError(null);
    start(async () => {
      try {
        const r = await submitChallenge(challenge.id, Object.values(selected));
        setResult(r);
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push('/entrar');
        else setError(m);
      }
    });
  }

  if (challenge.completed || result) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
        <p className="mb-3 font-semibold text-emerald-300">Desafio concluído! 🎉</p>
        {result?.grantedPackInventoryId && (
          <Link href={`/abrir/${result.grantedPackInventoryId}`} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
            Abrir pacote de recompensa
          </Link>
        )}
        {result?.rewardMomentId && (
          <Link href={`/momento/${result.rewardMomentId}`} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
            Ver Lance de recompensa
          </Link>
        )}
        {!result && <p className="text-sm text-muted">Você já completou este desafio.</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-1 font-semibold text-ink">Montador de Entrada</h2>
      <p className="mb-4 text-sm text-muted">
        Selecione um Lance seu para cada exigência.
        {challenge.burnOnComplete && (
          <span className="text-accent"> Atenção: os Lances usados serão QUEIMADOS.</span>
        )}
      </p>

      <div className="space-y-4">
        {challenge.required.map((r) => (
          <div key={r.template.id}>
            <div className="mb-1 text-sm text-ink">
              {r.template.player.name} <span className="text-muted">· {r.template.title}</span>
            </div>
            {r.eligible.length === 0 ? (
              <p className="text-xs text-accent">Você não possui este Lance.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.eligible.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected((s) => ({ ...s, [r.template.id]: m.id }))}
                    className={`rounded-lg border px-3 py-1 text-sm transition-colors ${
                      selected[r.template.id] === m.id
                        ? 'border-accent text-accent'
                        : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    #{m.serial}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}

      <button
        disabled={!allCovered || pending || !isAuthed}
        onClick={submit}
        className="mt-5 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Enviando…' : !isAuthed ? 'Entre para participar' : allCovered ? 'Completar desafio' : 'Selecione todos os Lances'}
      </button>
    </div>
  );
}
