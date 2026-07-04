import Link from 'next/link';
import {
  getActivityServer,
  getChallengesServer,
  getDropsServer,
  getPacksServer,
} from '@/lib/api-server';
import ActivityFeed from '@/components/ActivityFeed';
import { TIER_META } from '@/lib/tiers';
import { brl, dateTime } from '@/lib/format';
import type { Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Título de seção em dois tons (padrão das telas do Top Shot: "Win Now. Trade-In To Win").
function SectionTitle({ white, colored }: { white: string; colored: string }) {
  return (
    <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
      <span className="text-ink">{white}</span> <span className="text-accent">{colored}</span>
    </h2>
  );
}

export default async function Home() {
  const [drops, packs, activity, challenges] = await Promise.all([
    getDropsServer().catch(() => []),
    getPacksServer().catch(() => []),
    getActivityServer(8).catch(() => []),
    getChallengesServer().catch(() => []),
  ]);

  const hero = drops.find((d) => d.status === 'LIVE') ?? drops.find((d) => d.status === 'WAITING') ?? drops[0];
  const buyablePacks = packs.filter((p) => p.priceCents > 0).slice(0, 3);
  const activeChallenges = challenges.filter((c) => c.active && !c.completed).slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* Hero do drop ativo (seção 11.3) */}
      {hero && (
        <section className="relative mb-10 overflow-hidden  border border-line">
          <div className="absolute inset-0 bg-sunset opacity-25" aria-hidden />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'radial-gradient(80% 120% at 20% 0%, transparent 30%, #050505 100%)' }}
          />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={` px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  hero.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-panel2 text-muted'
                }`}
              >
                {hero.status === 'LIVE' ? '● Drop ao vivo' : 'Sala de espera aberta'}
              </span>
              {hero.requiredCollectorScore > 0 && (
                <span className="text-[11px] text-muted">Score mín. {hero.requiredCollectorScore}</span>
              )}
            </div>
            <h1 className="max-w-2xl font-display text-4xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl">
              {hero.name}
            </h1>
            <p className="mt-3 max-w-lg text-sm text-muted">
              {hero.packs.map((p) => p.name).join(' · ')} — fila aleatória, janela de compra de 20
              minutos{hero.hasRebound ? ' e rebound para quem ficar de fora' : ''}. Termina em{' '}
              {dateTime(hero.endsAt).split(',')[0]}.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`/drop/${hero.id}`}
                className="bg-accent px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                Entrar no drop
              </Link>
              <Link
                href="/pacotes"
                className="bg-white px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-black transition-opacity hover:opacity-90"
              >
                Rip packs 24/7
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {/* Pacotes em destaque */}
          <section className="mb-10">
            <SectionTitle white="Abra agora." colored="Pacotes 24/7" />
            <div className="grid gap-3 sm:grid-cols-3">
              {buyablePacks.map((p) => {
                const remaining = p.totalSupply - p.soldCount;
                const pct = Math.round((p.soldCount / Math.max(1, p.totalSupply)) * 100);
                return (
                  <Link
                    key={p.id}
                    href={`/pacote/${p.id}`}
                    className="group  border border-line bg-[#0e0e10] p-4 transition-colors hover:border-[#3a2b52]"
                  >
                    <div className="mb-3 flex h-24 items-center justify-center  bg-sunset/20">
                      <div className="h-16 w-12  bg-sunset shadow-neon transition-transform group-hover:-translate-y-0.5" />
                    </div>
                    <div className="text-sm font-bold uppercase text-ink">{p.name}</div>
                    <div className="mt-1 text-[11px] text-muted">
                      {p.momentCount} Lances · {remaining.toLocaleString('pt-BR')} restantes
                      {pct >= 50 && <span className="ml-1 text-amber-300">· {pct}% vendido</span>}
                    </div>
                    <div className="mt-2 text-[13px] font-bold text-accent3">{brl(p.priceCents)}</div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Desafios em destaque */}
          {activeChallenges.length > 0 && (
            <section>
              <SectionTitle white="Ganhe prêmios." colored="Desafios" />
              <div className="space-y-2">
                {activeChallenges.map((c) => (
                  <Link
                    key={c.id}
                    href={`/jogar/desafios/${c.id}`}
                    className="flex items-center justify-between gap-3  border border-line bg-[#0e0e10] px-4 py-3 transition-colors hover:border-[#3a2b52]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink">
                        {c.type === 'FLASH' && <span className="mr-1.5 text-accent2">⚡</span>}
                        {c.name}
                      </div>
                      <div className="truncate text-[11px] text-muted">{c.description}</div>
                    </div>
                    {c.progress && (
                      <span className="shrink-0 tabular-nums text-[11px] text-accent3">
                        {c.progress.have}/{c.progress.need}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Feed de vendas ao vivo (componente assinatura, seção 11.3) */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <SectionTitle white="Mercado." colored="Ao vivo" />
            <Link href="/mercado/atividade" className="text-[11px] font-bold uppercase tracking-wide text-accent3 hover:underline">
              Ver tudo
            </Link>
          </div>
          <div className="border border-line bg-[#0e0e10] p-2">
            <ActivityFeed initial={activity} limit={8} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(Object.keys(TIER_META) as Tier[]).map((t) => (
              <Link
                key={t}
                href={`/mercado?tier=${t}`}
                className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold text-muted transition-colors hover:text-ink"
              >
                {TIER_META[t].label}s
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
