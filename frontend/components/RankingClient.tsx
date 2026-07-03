'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { lockToLeaderboard, snapshotLeaderboard } from '@/lib/api-client';
import type { LeaderboardDetail } from '@/lib/types';

export default function RankingClient({
  board,
  isAdmin,
  isAuthed,
}: {
  board: LeaderboardDetail;
  isAdmin: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [momentId, setMomentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        setMomentId('');
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  };

  if (board.snapshotAt) {
    return (
      <div className="border border-line bg-panel p-5 text-sm text-muted">
        Ranking encerrado em {new Date(board.snapshotAt).toLocaleDateString('pt-BR')} — prêmios distribuídos.
      </div>
    );
  }

  return (
    <div className="space-y-4  border border-line bg-panel p-5">
      <div>
        <h2 className="mb-1 font-semibold text-ink">Travar Lance para pontuar</h2>
        <p className="mb-3 text-xs text-muted">
          Travar soma a Pontuação wefans do Lance ao seu total neste ranking (trava temporária de 7 dias).
        </p>
        {error && <p className="mb-2  border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
        {!isAuthed ? (
          <p className="text-sm text-muted">Entre para participar.</p>
        ) : board.eligibleMoments.length === 0 ? (
          <p className="text-sm text-muted">Você não tem Lances elegíveis (ou já travou todos).</p>
        ) : (
          <div className="flex gap-2">
            <select
              value={momentId}
              onChange={(e) => setMomentId(e.target.value)}
              className="flex-1  border border-line bg-panel2 px-3 py-2 text-ink outline-none"
            >
              <option value="">Escolha um Lance…</option>
              {board.eligibleMoments.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.playerName} #{m.serial} · {m.points} pts
                </option>
              ))}
            </select>
            <button
              className="bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!momentId || pending}
              onClick={() => run(() => lockToLeaderboard(board.id, momentId))}
            >
              🔒 Travar
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="border-t border-line pt-3">
          <button
            className="border border-line px-4 py-2 text-sm text-muted hover:text-ink disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              if (confirm('Snapshot encerra o ranking e distribui os prêmios. Continuar?'))
                run(() => snapshotLeaderboard(board.id));
            }}
          >
            ⚙️ Snapshot (encerrar e premiar)
          </button>
        </div>
      )}
    </div>
  );
}
