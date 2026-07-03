'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimQuest } from '@/lib/api-client';

export default function QuestClaimButton({
  questId,
  eligible,
  claimed,
  isAuthed,
}: {
  questId: string;
  eligible: boolean;
  claimed: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (claimed) return <span className="text-sm text-emerald-300">✓ Resgatada</span>;

  function onClaim() {
    setError(null);
    start(async () => {
      try {
        const r = await claimQuest(questId);
        if (r.rewardMomentId) router.push(`/momento/${r.rewardMomentId}`);
        else router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  }

  return (
    <div>
      <button
        onClick={onClaim}
        disabled={pending || !isAuthed || !eligible}
        className="bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Resgatando…' : eligible ? 'Resgatar recompensa' : 'Critério não cumprido'}
      </button>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
