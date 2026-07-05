'use client';

import Icon from './Icon';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeFastbreakDay, submitFastbreakLineup } from '@/lib/api-client';
import type { FastBreakDayDetail } from '@/lib/types';

const STAT_LABEL: Record<string, string> = {
  gols: 'gols',
  assistencias: 'assistências',
  defesas: 'defesas',
  desarmes: 'desarmes',
  nota: 'nota',
};

export default function MatchdayDayClient({
  day,
  isAdmin,
  isAuthed,
}: {
  day: FastBreakDayDetail;
  isAdmin: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({}); // playerId -> momentId
  const [captainPlayer, setCaptainPlayer] = useState<string | null>(null);

  const chosen = Object.keys(selected);
  const full = chosen.length === day.lineupSize;

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  };

  function togglePlayer(playerId: string, momentId: string, exhausted: boolean) {
    if (exhausted) return;
    setSelected((s) => {
      const next = { ...s };
      if (next[playerId]) {
        delete next[playerId];
        if (captainPlayer === playerId) setCaptainPlayer(null);
      } else if (Object.keys(next).length < day.lineupSize) {
        next[playerId] = momentId;
      }
      return next;
    });
  }

  const adminClose = isAdmin && !day.closed && (
    <div className="border-t border-line pt-3">
      <button
        className="border border-line px-4 py-2 text-sm text-muted hover:text-ink disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (confirm('Fechar a rodada calcula os resultados. Continuar?')) run(() => closeFastbreakDay(day.id));
        }}
      >
        Fechar rodada (calcular resultados)
      </button>
    </div>
  );

  if (day.my?.submitted) {
    return (
      <div className="space-y-3  border border-line bg-panel p-5">
        {day.closed ? (
          <p className={day.my.won ? 'text-emerald-300' : 'text-muted'}>
            {day.my.won ? <><Icon name="trophy" size={14} className="inline align-[-2px] text-amber-300" /> Você venceu a rodada!</> : 'Não foi dessa vez.'} Seu score:{' '}
            <span className="font-display text-xl text-ink">{day.my.score}</span> (alvo {day.targetScore})
          </p>
        ) : (
          <p className="text-emerald-300">✓ Escalação enviada. Aguarde o fechamento da rodada.</p>
        )}
        {adminClose}
      </div>
    );
  }

  if (day.eliminated) {
    return (
      <div className="border border-line bg-panel p-5 text-sm text-accent">
        <Icon name="skull" size={14} className="inline align-[-2px]" /> Você foi eliminado deste mata-mata.
        {adminClose}
      </div>
    );
  }

  if (day.closed) {
    return (
      <div className="border border-line bg-panel p-5 text-sm text-muted">
        Rodada fechada — você não escalou.
      </div>
    );
  }

  return (
    <div className="space-y-4  border border-line bg-panel p-5">
      <div>
        <h2 className="font-semibold text-ink">
          Escale {day.lineupSize} jogadores <span className="text-muted">({chosen.length}/{day.lineupSize})</span>
        </h2>
        <p className="text-xs text-muted">
          Alvo: {day.targetScore} {STAT_LABEL[day.statKey] ?? day.statKey} · toque na estrela para definir o captain (2×)
        </p>
      </div>

      {error && <p className="border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      {!isAuthed ? (
        <p className="text-sm text-muted">Entre para escalar.</p>
      ) : (
        <div className="space-y-2">
          {day.eligible.map((g) => {
            const exhausted = g.used >= g.maxUses;
            const isSel = !!selected[g.playerId];
            const isCap = captainPlayer === g.playerId;
            return (
              <div
                key={g.playerId}
                className={`flex items-center justify-between gap-2  border px-3 py-2 transition-colors ${
                  exhausted
                    ? 'border-line opacity-40'
                    : isSel
                      ? 'border-accent'
                      : 'border-line hover:border-accent/40'
                }`}
              >
                <button
                  className="flex-1 text-left"
                  disabled={exhausted || pending}
                  onClick={() => togglePlayer(g.playerId, g.moments[0].id, exhausted)}
                >
                  <div className="text-sm text-ink">
                    {g.playerName} {isSel && <span className="text-accent">✓</span>}
                  </div>
                  <div className="text-[11px] text-muted">
                    usos {g.used}/{g.maxUses} {exhausted && '· esgotado (fadiga)'} · melhor carta #{g.moments[0].serial} ({g.moments[0].tier})
                  </div>
                </button>
                {isSel && (
                  <button
                    title="Captain (2×)"
                    disabled={pending}
                    onClick={() => setCaptainPlayer(isCap ? null : g.playerId)}
                    className={isCap ? 'text-amber-300' : 'text-neutral-500 opacity-40 hover:opacity-100'}
                  >
                    <Icon name="star" filled={isCap} size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        disabled={!full || pending || !isAuthed}
        onClick={() =>
          run(() =>
            submitFastbreakLineup(
              day.id,
              Object.values(selected),
              captainPlayer ? selected[captainPlayer] : undefined,
            ),
          )
        }
        className="bg-accent px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Enviando…' : full ? 'Confirmar escalação' : `Selecione ${day.lineupSize - chosen.length} jogador(es)`}
      </button>

      {adminClose}
    </div>
  );
}
