'use client';

import Icon from './Icon';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitChallenge } from '@/lib/api-client';
import type { ChallengeDetail } from '@/lib/types';

// Resgate de Desafio Relâmpago: critério avaliado contra as stats simuladas de hoje.
export default function FlashClaim({
  challenge,
  isAuthed,
}: {
  challenge: ChallengeDetail;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState<string | null>(null);
  const flash = challenge.flash!;

  if (challenge.completed || granted) {
    return (
      <div className="border border-emerald-500/40 bg-emerald-500/10 p-6">
        <p className="mb-3 font-semibold text-emerald-300">Desafio relâmpago concluído!</p>
        {granted && (
          <Link href={`/abrir/${granted}`} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
            Abrir pacote de recompensa
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-1 font-semibold text-ink"><Icon name="zap" size={14} className="inline align-[-2px] text-accent2" /> Critério de hoje</h2>
      <p className="mb-4 text-sm text-muted">
        Tenha o Momento de um jogador com {flash.min}+ {flash.stat} hoje (stats simuladas).
      </p>

      <div className="mb-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted">Quem cumpriu hoje</div>
        {flash.scorersToday.length === 0 ? (
          <p className="text-sm text-muted">Ninguém ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {flash.scorersToday.map((n) => {
              const mine = flash.myScorers.includes(n);
              return (
                <span
                  key={n}
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    mine ? 'bg-emerald-500/15 text-emerald-300' : 'bg-panel2 text-muted'
                  }`}
                >
                  {n}
                  {mine && ' ✓ seu'}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg mb-3  border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      <button
        disabled={pending || !isAuthed || !flash.eligible}
        title={!isAuthed ? 'Entre para resgatar' : !flash.eligible ? 'Você ainda não cumpre o critério de hoje' : undefined}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const r = await submitChallenge(challenge.id, []);
              if (r.grantedPackInventoryId) setGranted(r.grantedPackInventoryId);
              router.refresh();
            } catch (e) {
              const m = e instanceof Error ? e.message : 'Erro';
              if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
              else setError(m);
            }
          })
        }
        className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Resgatando…' : !isAuthed ? 'Entre para participar' : flash.eligible ? 'Resgatar recompensa' : 'Nenhum Momento seu cumpre hoje'}
      </button>
    </div>
  );
}
