'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deposit, logout, patchFavoriteTeam } from '@/lib/api-client';
import { brl, dateTime } from '@/lib/format';
import type { TeamDTO, UserDTO, Wallet } from '@/lib/types';

const QUICK = [5000, 10000, 25000]; // R$ 50 / 100 / 250

export default function PerfilClient({
  me,
  wallet,
  teams,
}: {
  me: UserDTO;
  wallet: Wallet | null;
  teams: TeamDTO[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState('50');
  const [teamId, setTeamId] = useState(me.favoriteTeam?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro');
      }
    });
  };

  const kpis = [
    { label: 'Pontuação wefans', value: me.topShotScore.toLocaleString('pt-BR') },
    { label: 'Score do Colecionador', value: me.collectorScore.toLocaleString('pt-BR') },
    { label: 'Fichas de Troca', value: me.tradeTickets },
    { label: 'Saldo', value: brl(me.balanceCents) },
  ];

  const card = 'rounded-2xl border border-line bg-panel p-5';
  const field =
    'rounded-lg border border-line bg-panel2 px-3 py-2 text-ink outline-none focus:border-accent/60';
  const btn =
    'rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50';

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl uppercase text-ink">@{me.username}</h1>
          <p className="text-sm text-muted">
            {me.email} · membro desde {dateTime(me.createdAt).split(',')[0]}
            {me.isAdmin && (
              <span className="ml-2 rounded bg-accent2/20 px-2 py-0.5 text-xs text-accent2">admin</span>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(async () => { await logout(); router.push('/'); })}
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink"
        >
          Sair
        </button>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={card}>
            <div className="font-display text-2xl text-ink">{k.value}</div>
            <div className="mt-1 text-xs text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Depósito */}
        <section className={card}>
          <h2 className="mb-1 font-semibold text-ink">Carteira</h2>
          <p className="mb-4 text-sm text-muted">Depósito simulado em BRL (carteira de teste).</p>
          <div className="mb-3 flex gap-2">
            <div className="flex items-center rounded-lg border border-line bg-panel2 px-3">
              <span className="text-muted">R$</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 bg-transparent px-2 py-2 text-ink outline-none"
              />
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deposit(Math.round(Number(amount) * 100)))}
              className={btn}
            >
              Depositar
            </button>
          </div>
          <div className="flex gap-2">
            {QUICK.map((c) => (
              <button
                key={c}
                type="button"
                disabled={pending}
                onClick={() => run(() => deposit(c))}
                className="rounded-lg border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent3/50 hover:text-ink"
              >
                +{brl(c)}
              </button>
            ))}
          </div>
        </section>

        {/* Time seguido */}
        <section className={card}>
          <h2 className="mb-1 font-semibold text-ink">Time seguido</h2>
          <p className="mb-4 text-sm text-muted">
            Necessário para ganhar pacotes por check-in no estádio (app).
          </p>
          <div className="flex gap-2">
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={`${field} flex-1`}>
              <option value="">Nenhum</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => patchFavoriteTeam(teamId || null))}
              className={btn}
            >
              Salvar
            </button>
          </div>
          {me.favoriteTeam && (
            <p className="mt-3 text-sm text-muted">
              Seguindo: <span className="text-accent3">{me.favoriteTeam.name}</span>
            </p>
          )}
        </section>
      </div>

      {/* Histórico da carteira */}
      <section className={`${card} mt-6`}>
        <h2 className="mb-3 font-semibold text-ink">Histórico da carteira</h2>
        {wallet && wallet.transactions.length > 0 ? (
          <ul className="divide-y divide-line">
            {wallet.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="text-ink">{tx.type}</span>
                  {tx.memo && <span className="ml-2 text-muted">{tx.memo}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className={tx.amountCents >= 0 ? 'text-emerald-400' : 'text-accent'}>
                    {tx.amountCents >= 0 ? '+' : ''}
                    {brl(tx.amountCents)}
                  </span>
                  <span className="font-mono text-xs text-muted">{brl(tx.balanceAfterCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum lançamento ainda. Faça um depósito acima.</p>
        )}
      </section>
    </main>
  );
}
