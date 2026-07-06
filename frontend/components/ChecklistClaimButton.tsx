'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimChecklist } from '@/lib/api-client';

export default function ChecklistClaimButton({
  checklistId,
  complete,
  claimed,
  isAuthed,
}: {
  checklistId: string;
  complete: boolean;
  claimed: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (claimed) return <span className="text-sm text-emerald-300">✓ Bônus resgatado</span>;

  return (
    <div>
      <button
        disabled={pending || !isAuthed || !complete}
        title={!isAuthed ? 'Entre para resgatar' : !complete ? 'Complete o checklist para liberar o bônus' : undefined}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              await claimChecklist(checklistId);
              router.refresh();
            } catch (e) {
              const m = e instanceof Error ? e.message : 'Erro';
              if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
              else setError(m);
            }
          })
        }
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Resgatando…' : complete ? 'Resgatar bônus' : 'Incompleto'}
      </button>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
