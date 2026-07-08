import Icon from '@/components/Icon';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getActivityServer,
  getChallengesServer,
  getDropsServer,
  getPacksServer,
  getPackDetailServer,
  getTemplatesServer,
  getMe,
} from '@/lib/api-server';
import ActivityFeed from '@/components/ActivityFeed';
import Countdown from '@/components/Countdown';
import MomentCard from '@/components/MomentCard';
import TacticalBoard from '@/components/TacticalBoard';
import { TIER_META, TIER_ORDER, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
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
  // Uma "casa" só (padrão X): logado cai direto no feed; a vitrine abaixo
  // é a landing do visitante.
  const me = await getMe();
  if (me) redirect('/explorar');

  const [drops, packs, activity, challenges, templates] = await Promise.all([
    getDropsServer().catch(() => []),
    getPacksServer().catch(() => []),
    getActivityServer(8).catch(() => []),
    getChallengesServer().catch(() => []),
    getTemplatesServer().catch(() => []),
  ]);

  const hero = drops.find((d) => d.status === 'LIVE') ?? drops.find((d) => d.status === 'WAITING') ?? drops[0];
  const heroPack = hero?.packs[0] ? await getPackDetailServer(hero.packs[0].id) : null;
  const heroLances = (heroPack?.possibleLances ?? [])
    .slice()
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .slice(0, 3);
  const buyablePacks = packs.filter((p) => p.priceCents > 0).slice(0, 3);
  const activeChallenges = challenges.filter((c) => c.active && !c.completed).slice(0, 3);
  const rares = templates.filter((t) => isFoil(t.tier)).slice(0, 4);

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
          <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,620px)_1fr]">
            <div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded-lg  px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
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
              minutos{hero.hasRebound ? ' e repescagem para quem ficar de fora' : ''}.
            </p>
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                {hero.status === 'LIVE' ? 'termina em' : 'compra abre em'}
              </div>
              <Countdown
                until={hero.status === 'LIVE' ? hero.endsAt : hero.startsAt}
                endedLabel="a qualquer momento"
                className="font-display text-4xl uppercase leading-none text-accent3"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`/drop/${hero.id}`}
                className="rounded-lg bg-accent px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
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

            {/* vitrine do pack do drop (mesma do /drops) */}
            {heroLances.length > 0 && (
              <div className="hidden lg:block">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
                  O que pode vir no pack
                </div>
                <div className="flex gap-4">
                  {heroLances.map((t) => {
                    const m = TIER_META[t.tier];
                    return (
                      <Link
                        key={t.id}
                        href={hero.packs[0] ? `/pacote/${hero.packs[0].id}` : '/pacotes'}
                        className="w-[120px] shrink-0"
                        style={{ perspective: '480px' }}
                      >
                        <div
                          className="aspect-[4/5] overflow-hidden rounded-lg border"
                          style={{
                            transform: 'rotateY(-12deg) rotateX(2deg)',
                            borderColor: `${m.color}77`,
                            boxShadow: `10px 8px 22px rgba(0,0,0,.6)${isFoil(t.tier) ? `, 0 0 16px ${m.color}40` : ''}`,
                          }}
                        >
                          <TacticalBoard
                            trajectory={t.trajectory}
                            jersey={t.player.jersey}
                            color={m.color}
                            foil={isFoil(t.tier)}
                          />
                        </div>
                        <div className="mt-1.5 text-center text-[10px] font-bold" style={{ color: m.color }}>
                          {m.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* landing de visitante: proposta de valor */}
      <Link
        href="/entrar"
        className="rounded-lg mb-10 flex flex-wrap items-center justify-between gap-4 border border-accent3/40 bg-accent3/5 px-6 py-4 transition-colors hover:bg-accent3/10"
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent3">Comece agora</div>
          <div className="font-display text-2xl uppercase text-ink">
            Crie a conta, ganhe R$ 500 e abra seu primeiro pack
          </div>
          <div className="text-[12px] text-muted">Moeda de teste — nenhum dinheiro real.</div>
        </div>
        <span className="rounded-lg bg-accent px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white">
          Criar conta grátis
        </span>
      </Link>

      {/* por que colecionar: a tese de valorização em 3 forças que o torcedor entende */}
      <section className="mb-10">
        <SectionTitle white="Por que colecionar." colored="Como um Momento valoriza" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: 'ball' as const,
              t: 'Craque em alta',
              d: 'Quando o jogador da jogada decide um clássico, faz gol ou é convocado, a procura pelos Momentos dele sobe — e o preço acompanha.',
            },
            {
              icon: 'lock' as const,
              t: 'Escassez',
              d: 'Edições limitadas nunca aumentam; exemplares queimados e emissões encerradas congelam o supply para sempre.',
            },
            {
              icon: 'star' as const,
              t: 'Colecionabilidade',
              d: 'Seriais baixos (#1, #7) e o número da camisa do craque valem um extra para os colecionadores.',
            },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-line bg-[#0e0e10] p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent3/10 text-accent3" aria-hidden>
                <Icon name={f.icon} size={20} />
              </span>
              <div className="mt-2 font-display text-lg uppercase text-ink">{f.t}</div>
              <div className="mt-1 text-[12px] leading-snug text-muted">{f.d}</div>
            </div>
          ))}
        </div>
        <Link
          href="/como-funciona#valoriza"
          className="mt-3 inline-block text-[12px] font-semibold text-accent3 hover:underline"
        >
          Entenda como o valor se forma →
        </Link>
      </section>

      {rares.length > 0 && (
        <section className="mb-10">
          <SectionTitle white="Raridade em campo." colored="Lendários e Galácticos" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rares.map((t) => (
              <MomentCard key={t.id} template={t} href={`/moment/${t.id}`} stillMedia />
            ))}
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
                    className="rounded-2xl group  border border-line bg-[#0e0e10] p-4 transition-colors hover:border-[#3a2b52]"
                  >
                    <div className="mb-3 flex h-24 items-center justify-center  bg-sunset/20">
                      <div className="h-16 w-12  bg-sunset shadow-neon transition-transform group-hover:-translate-y-0.5" />
                    </div>
                    <div className="text-sm font-bold uppercase text-ink">{p.name}</div>
                    <div className="mt-1 text-[11px] text-muted">
                      {p.momentCount} Momentos · {remaining.toLocaleString('pt-BR')} restantes
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
                    className="rounded-2xl flex items-center justify-between gap-3  border border-line bg-[#0e0e10] px-4 py-3 transition-colors hover:border-[#3a2b52]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink">
                        {c.type === 'FLASH' && <Icon name="zap" size={14} className="mr-1.5 inline align-[-2px] text-accent2" />}
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
          <div className="rounded-2xl border border-line bg-[#0e0e10] p-2">
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
