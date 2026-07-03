'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getNonce, submitCheckin } from '@/lib/api-client';
import type { ActiveFixture } from '@/lib/types';

export default function CheckinPanel({ fixture }: { fixture: ActiveFixture }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'err' | 'review'; text: string } | null>(null);

  const done = fixture.checkinStatus === 'VALID';
  const inReview = fixture.checkinStatus === 'REVIEW';

  function doCheckin(atStadium: boolean) {
    setMsg(null);
    start(async () => {
      try {
        const { nonce } = await getNonce();
        const lat = atStadium ? fixture.stadium.lat : fixture.stadium.lat + 0.1; // ~11km fora
        const r = await submitCheckin({
          fixtureId: fixture.id,
          lat,
          lng: fixture.stadium.lng,
          accuracy: 15,
          isMock: false,
          attestationToken: 'dev-ok',
          nonce,
        });
        if (r.status === 'VALID' && r.grantedPackInventoryId) {
          router.push(`/abrir/${r.grantedPackInventoryId}`);
          router.refresh();
        } else if (r.status === 'REVIEW') {
          setMsg({ kind: 'review', text: r.reason ?? 'Enviado para revisão.' });
          router.refresh();
        } else {
          setMsg({ kind: 'err', text: r.reason ?? 'Check-in recusado.' });
        }
      } catch (e) {
        setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Erro no check-in' });
      }
    });
  }

  return (
    <div className="border border-line bg-panel p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-display text-xl text-ink">
          {fixture.homeTeam} <span className="text-muted">x</span> {fixture.awayTeam}
        </h3>
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
          ao vivo
        </span>
      </div>
      <p className="text-sm text-muted">
        {fixture.stadium.name} · {fixture.stadium.city} · raio {fixture.stadium.radiusMeters}m
      </p>
      <p className="mb-4 text-sm text-muted">
        Recompensa: <span className="text-accent3">{fixture.rewardPackName}</span>
      </p>

      {done ? (
        <div className="text-sm text-emerald-300">✓ Você já fez check-in neste jogo.</div>
      ) : inReview ? (
        <div className="text-sm text-amber-300">Em revisão de fraude.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => doCheckin(true)}
            disabled={pending}
            className="bg-accent px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Verificando…' : 'Fazer check-in (no estádio)'}
          </button>
          <button
            onClick={() => doCheckin(false)}
            disabled={pending}
            className="border border-line px-4 py-2.5 text-sm text-muted transition-colors hover:text-ink"
          >
            Simular longe do estádio
          </button>
        </div>
      )}

      {msg && (
        <p
          className={`mt-3  border px-3 py-2 text-sm ${
            msg.kind === 'err'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
