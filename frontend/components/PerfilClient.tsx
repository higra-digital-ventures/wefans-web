'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deposit, logout, patchFavoriteTeam, patchShowInFeed } from '@/lib/api-client';
import { brl, dateTime } from '@/lib/format';
import type { TeamDTO, UserDTO, Wallet } from '@/lib/types';

const QUICK = [5000, 10000, 25000]; // R$ 50 / 100 / 250

export default function PerfilClient({
  me,
  wallet,
  teams,
  momentCount,
  children,
}: {
  me: UserDTO;
  wallet: Wallet | null;
  teams: TeamDTO[];
  momentCount: number;
  children?: ReactNode;
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
    { label: 'Lances', value: momentCount.toLocaleString('pt-BR') },
  ];
  const TABS = [
    { label: 'Visão geral', href: '/perfil', active: true },
    { label: 'Moments', href: '/colecao' },
    { label: 'Pacotes', href: '/mercado/pacotes' },
    { label: 'Ofertas', href: '/ofertas' },
    { label: 'Fichas', href: '/fichas' },
    { label: 'Vitrines', href: '/vitrines' },
    { label: 'Check-in', href: '/checkin' },
  ];

  const card = ' border border-line bg-[#0e0e10] p-5';
  const field =
    ' border border-line bg-panel2 px-3 py-2 text-ink outline-none focus:border-accent/60';
  const btn =
    ' bg-accent px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50';

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      {/* linha de identidade + widgets de KPI (print b) */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sunset font-display text-2xl uppercase text-white">
            {me.username[0]}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl uppercase tracking-tight text-ink">@{me.username}</h1>
              {me.isAdmin && (
                <span className="bg-accent2/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent2">
                  admin
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted">
              {me.email} · entrou em {dateTime(me.createdAt).split(',')[0]}
            </p>
            <div className="mt-1 flex gap-3 text-[12px]">
              <Link href={`/u/${me.username}`} className="text-accent3 hover:underline">
                perfil público
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(async () => { await logout(); router.push('/'); })}
                className="text-muted transition-colors hover:text-ink"
              >
                sair
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {kpis.map((k) => (
            <div key={k.label} className="min-w-[110px]  border border-line bg-[#0e0e10] px-4 py-3">
              <div className="font-display text-xl text-ink">{k.value}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{k.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* sub-abas (print b) */}
      <div className="scrollbar-none -mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`relative whitespace-nowrap px-3 pb-2.5 pt-1 text-[12px] font-bold uppercase tracking-[0.08em] ${
              t.active ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.active && <span className="absolute inset-x-3 bottom-0 h-[3px]  bg-accent" />}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mb-6  border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {/* carteira em destaque */}
      <div className="mb-6 flex flex-wrap items-center gap-4  border border-line bg-[#0e0e10] px-5 py-4">
        <div>
          <div className="font-display text-2xl text-ink">{brl(me.balanceCents)}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Saldo da carteira</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-xl text-ink">{me.tradeTickets}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Fichas de Troca</div>
          </div>
          <Link href="/fichas" className="border border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted hover:text-ink">
            Trocar
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Depósito */}
        <section className={card}>
          <h2 className="mb-1 font-semibold text-ink">Carteira</h2>
          <p className="mb-3 border border-accent3/30 bg-accent3/5 px-3 py-2 text-[12px] leading-snug text-accent3">
            Moeda de teste — o saldo é fictício, para experimentar o produto. Nenhum dinheiro
            real é movimentado; deposite à vontade.
          </p>
          <div className="mb-3 flex gap-2">
            <div className="flex items-center  border border-line bg-panel2 px-3">
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
                className="border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent3/50 hover:text-ink"
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

          {/* privacidade: opt-out do feed público do Explorar */}
          <div className="mt-5 border-t border-line pt-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold text-ink">Aparecer no feed público</span>
                <span className="block text-xs text-muted">
                  Suas compras, aberturas de pacote e conquistas aparecem no Explorar.
                </span>
              </span>
              <input
                type="checkbox"
                checked={me.showInFeed}
                disabled={pending}
                onChange={(e) => run(() => patchShowInFeed(e.target.checked))}
                className="h-4 w-4 accent-[#21d4e0]"
              />
            </label>
          </div>
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

      {children}
    </main>
  );
}
