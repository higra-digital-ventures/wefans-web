import Link from 'next/link';
import Countdown from '@/components/Countdown';
import TacticalBoard from '@/components/TacticalBoard';
import {
  getDropsServer,
  getDropServer,
  getPacksServer,
  getPackDetailServer,
  getFastbreakRunsServer,
  getActiveFixturesServer,
  getMe,
} from '@/lib/api-server';
import { TIER_META, TIER_ORDER, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { DropSummary, PackDTO, Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendado',
  WAITING: 'Sala de espera',
  LIVE: 'Ao vivo',
  ENDED: 'Encerrado',
};

// odds sempre na ordem de raridade (Comum → Galáctico) para leitura instantânea
const RARITY_ASC = [...TIER_ORDER].reverse();

function OddsChips({ pack }: { pack: PackDTO }) {
  const entries = Object.entries(pack.oddsJson).sort(
    ([a], [b]) => RARITY_ASC.indexOf(a as Tier) - RARITY_ASC.indexOf(b as Tier),
  );
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([tier, p]) => {
        const meta = TIER_META[tier as Tier];
        return (
          <span
            key={tier}
            className="px-1.5 py-px text-[9px] font-semibold"
            style={{ background: `${meta.color}1f`, color: meta.color }}
          >
            {meta.label} {(p * 100).toFixed(p * 100 < 1 ? 1 : 0)}%
          </span>
        );
      })}
    </div>
  );
}

// "exige X · você tem Y" — elegibilidade de score com o dado do próprio usuário
function ScoreGate({ required, mine }: { required: number; mine: number | null }) {
  if (required <= 0) return null;
  if (mine == null) {
    return <span className="text-[11px] text-ink/80">Score do Colecionador mín. {required}</span>;
  }
  const ok = mine >= required;
  return (
    <span className={`text-[11px] font-semibold ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
      exige {required.toLocaleString('pt-BR')} · você tem {mine.toLocaleString('pt-BR')}{' '}
      {ok ? '✓' : `✗ (faltam ${(required - mine).toLocaleString('pt-BR')})`}
    </span>
  );
}

// Card de pacote dentro do drop (print f): supply/restantes, pill de reserva, SOLD OUT.
function DropPackCard({ drop, pack }: { drop: DropSummary; pack: PackDTO }) {
  const remaining = pack.totalSupply - pack.soldCount;
  const soldOut = remaining <= 0;
  const reservedPct = Math.round((pack.soldCount / Math.max(1, pack.totalSupply)) * 100);

  return (
    <div className="relative overflow-hidden border border-line bg-black/50 p-4 backdrop-blur-sm">
      {reservedPct >= 40 && !soldOut && (
        <span className="absolute right-3 top-3 rounded-full bg-accent2/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent2">
          {reservedPct}% reservado
        </span>
      )}
      {soldOut && (
        <span className="absolute -right-9 top-4 rotate-45 bg-panel2 px-10 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted shadow">
          Sold out
        </span>
      )}
      <div className="mb-2 flex items-center gap-3">
        <div className="h-14 w-10 shrink-0 bg-sunset shadow-neon" aria-hidden />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold uppercase text-ink">{pack.name}</div>
          <div className="text-[10px] text-muted">
            Tiragem: {pack.totalSupply.toLocaleString('pt-BR')} · Restantes:{' '}
            {remaining.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
      <OddsChips pack={pack} />
      <div className="mt-3">
        {soldOut ? (
          <Link
            href="/mercado/pacotes"
            className="block bg-white py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-black"
          >
            Ver no mercado
          </Link>
        ) : (
          <Link
            href={`/drop/${drop.id}`}
            className="block bg-accent py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
          >
            {drop.status === 'LIVE' ? `Comprar · ${brl(pack.priceCents)}` : `Entrar na fila · ${brl(pack.priceCents)}`}
          </Link>
        )}
      </div>
    </div>
  );
}

// Card rico da lista: faixa de arte, status, countdown e CTA.
function DropCard({ d, myScore }: { d: DropSummary; myScore: number | null }) {
  const ended = d.status === 'ENDED';
  return (
    <Link
      key={d.id}
      href={`/drop/${d.id}`}
      className={`group overflow-hidden border border-line bg-[#0e0e10] transition-colors hover:border-white/30 ${ended ? 'opacity-70' : ''}`}
    >
      <div className="relative flex h-20 items-end bg-sunset p-3" aria-hidden>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 160% at 50% -30%, transparent 30%, #0e0e10 96%)' }} />
        <span className="relative font-display text-2xl uppercase leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]">
          {d.name}
        </span>
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              d.status === 'LIVE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-panel2 text-muted'
            }`}
          >
            {STATUS_LABEL[d.status] ?? d.status}
          </span>
          {!ended && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-accent3">
              {d.status === 'LIVE' ? (
                <>termina em <Countdown until={d.endsAt} /></>
              ) : d.status === 'WAITING' ? (
                <>compra abre em <Countdown until={d.startsAt} endedLabel="a qualquer momento" /></>
              ) : (
                <>sala abre em <Countdown until={d.waitingRoomOpensAt} endedLabel="a qualquer momento" /></>
              )}
            </span>
          )}
          <span className="ml-auto">
            <ScoreGate required={d.requiredCollectorScore} mine={myScore} />
          </span>
        </div>
        <div className="text-[11px] text-muted">
          {d.packs.map((p) => `${p.name} · ${brl(p.priceCents)}`).join('  ·  ')}
        </div>
        {d.packs[0] && (
          <div className="mt-2">
            <OddsChips pack={d.packs[0]} />
          </div>
        )}
        <div
          className={`mt-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
            ended
              ? 'border border-line text-muted'
              : 'border border-white/25 text-white group-hover:bg-white/10'
          }`}
        >
          {ended ? 'Ver resultado' : d.status === 'LIVE' ? 'Ir para o drop' : 'Entrar na sala de espera'}
        </div>
      </div>
    </Link>
  );
}

export default async function DropsPage() {
  const [drops, packs, me, runs, fixtures] = await Promise.all([
    getDropsServer(),
    getPacksServer(),
    getMe(),
    getFastbreakRunsServer().catch(() => []),
    getActiveFixturesServer().catch(() => null),
  ]);
  const hero = drops.find((d) => d.status === 'LIVE') ?? drops.find((d) => d.status === 'WAITING');
  const [heroDetail, heroPack] = await Promise.all([
    hero ? getDropServer(hero.id) : null,
    hero?.packs[0] ? getPackDetailServer(hero.packs[0].id) : null,
  ]);
  const myScore = me?.collectorScore ?? null;

  const rest = drops.filter((d) => d.id !== hero?.id);
  const upcoming = rest.filter((d) => d.status !== 'ENDED');
  const ended = rest.filter((d) => d.status === 'ENDED');
  const ripPacks = packs.filter((p) => p.priceCents > 0 && !p.dropId).slice(0, 3);
  const openDays = runs
    .flatMap((r) => r.days.filter((day) => !day.closed).map((day) => ({ run: r, day })))
    .slice(0, 3);

  // vitrine do hero: os melhores Lances possíveis do pack, por raridade
  const heroLances = (heroPack?.possibleLances ?? [])
    .slice()
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .slice(0, 4);
  const myEntry = heroDetail?.myEntry ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* placar do dia: jogo do seu time com check-in aberto (mini scoreboard) */}
      {fixtures && fixtures.length > 0 && (
        <Link
          href="/checkin"
          className="mb-4 flex flex-wrap items-center gap-3 border border-emerald-400/30 bg-emerald-400/5 px-4 py-2.5 transition-colors hover:bg-emerald-400/10"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> hoje tem jogo
          </span>
          <span className="text-[13px] font-bold text-white">
            {fixtures[0].homeTeam} x {fixtures[0].awayTeam}
          </span>
          <span className="text-[11px] text-neutral-400">{fixtures[0].stadium}</span>
          <span className="ml-auto text-[11px] font-bold uppercase tracking-wide text-emerald-300">
            check-in aberto — ganhe um pack →
          </span>
        </Link>
      )}

      {/* hero do drop (print f) */}
      {hero && (
        <section className="relative mb-10 overflow-hidden border border-line">
          <div className="absolute inset-0 bg-sunset opacity-30" aria-hidden />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'radial-gradient(90% 130% at 50% -20%, transparent 20%, #050505 95%)' }}
          />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,560px)_1fr]">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    hero.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-black/40 text-ink'
                  }`}
                >
                  {STATUS_LABEL[hero.status]}
                </span>
                {hero.hasRebound && (
                  <span
                    className="text-[11px] text-accent3"
                    title="Se você ficar de fora da janela, ainda dá para tentar o pack de repescagem"
                  >
                    com repescagem
                  </span>
                )}
                <ScoreGate required={hero.requiredCollectorScore} mine={myScore} />
                {heroDetail && heroDetail.queueCount > 0 && (
                  <span className="text-[11px] text-neutral-300">
                    · {heroDetail.queueCount} colecionador{heroDetail.queueCount > 1 ? 'es' : ''} na fila
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
                {hero.name}
              </h1>

              {/* countdown protagonista */}
              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  {hero.status === 'LIVE' ? 'termina em' : 'compra abre em'}
                </div>
                <Countdown
                  until={hero.status === 'LIVE' ? hero.endsAt : hero.startsAt}
                  endedLabel="a qualquer momento"
                  className="font-display text-4xl uppercase leading-none text-accent3"
                />
              </div>

              {/* estado da minha fila, quando inscrito */}
              {myEntry && (
                <div className="mt-4 border border-accent3/40 bg-accent3/10 px-4 py-3 text-sm text-ink">
                  {myEntry.purchased ? (
                    <>✓ Você já comprou neste drop.</>
                  ) : myEntry.canBuyNow ? (
                    <>
                      Sua janela está <strong className="text-emerald-300">aberta agora</strong> —{' '}
                      <Link href={`/drop/${hero.id}`} className="underline">
                        compre antes que feche
                      </Link>
                      .
                    </>
                  ) : myEntry.position != null ? (
                    <>
                      Você é o <strong className="text-accent3">#{myEntry.position}</strong> da fila
                      {myEntry.windowStartsAt && (
                        <>
                          {' '}· sua janela abre em{' '}
                          <Countdown until={myEntry.windowStartsAt} endedLabel="instantes" className="font-semibold text-accent3" />
                        </>
                      )}
                    </>
                  ) : (
                    <>Você está inscrito — a fila será sorteada quando o drop começar.</>
                  )}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {hero.packs.map((p) => (
                  <DropPackCard key={p.id} drop={hero} pack={p} />
                ))}
              </div>
            </div>

            {/* vitrine: o que pode vir no pack */}
            {heroLances.length > 0 && (
              <div className="hidden lg:block">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
                  O que pode vir no pack
                </div>
                <div className="flex gap-4">
                  {heroLances.map((t) => {
                    const meta = TIER_META[t.tier];
                    return (
                      <Link
                        key={t.id}
                        href={`/pacote/${hero.packs[0].id}`}
                        className="group w-[128px] shrink-0"
                        style={{ perspective: '500px' }}
                      >
                        <div
                          className="aspect-[4/5] overflow-hidden border transition-transform duration-200 group-hover:[transform:rotateY(-4deg)_translateY(-4px)]"
                          style={{
                            transform: 'rotateY(-12deg) rotateX(2deg)',
                            borderColor: `${meta.color}77`,
                            boxShadow: `10px 8px 22px rgba(0,0,0,.6)${isFoil(t.tier) ? `, 0 0 16px ${meta.color}40` : ''}`,
                          }}
                        >
                          <TacticalBoard
                            trajectory={t.trajectory}
                            jersey={t.player.jersey}
                            color={meta.color}
                            foil={isFoil(t.tier)}
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <div className="text-[10px] font-bold" style={{ color: meta.color }}>
                            {meta.label}
                          </div>
                          <div className="truncate text-[11px] font-semibold text-white">
                            {t.player.name}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href={`/pacote/${hero.packs[0].id}`}
                  className="mt-4 inline-block text-[11px] text-neutral-300 underline underline-offset-2 hover:text-white"
                >
                  Ver todos os Lances possíveis →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* próximos */}
      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight text-ink">Próximos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((d) => (
              <DropCard key={d.id} d={d} myScore={myScore} />
            ))}
          </div>
        </section>
      )}

      {/* encerrados */}
      {ended.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight text-muted">Encerrados</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ended.map((d) => (
              <DropCard key={d.id} d={d} myScore={myScore} />
            ))}
          </div>
        </section>
      )}

      {/* Rip Packs 24/7 (print f) */}
      {ripPacks.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
            <span className="text-ink">Rip Packs.</span> <span className="text-accent3">24/7</span>
          </h2>
          <div className="border border-line bg-[#0e0e10] p-5">
            <p className="mb-4 text-sm text-muted">
              A experiência always-on do wefans — abra pacotes a qualquer hora, sem fila.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ripPacks.map((p) => (
                <Link
                  key={p.id}
                  href={`/pacote/${p.id}`}
                  className="group flex items-center gap-3 border border-line bg-black/40 p-3 transition-colors hover:border-[#3a2b52]"
                >
                  <div className="h-12 w-9 shrink-0 bg-sunset transition-transform group-hover:-translate-y-0.5" aria-hidden />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold uppercase text-ink">{p.name}</div>
                    <div className="text-[11px] font-semibold text-accent3">{brl(p.priceCents)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Valendo hoje: rodadas abertas do Matchday + banner das Fichas (Trade-In) */}
      {(openDays.length > 0 || true) && (
        <section className="grid gap-3 lg:grid-cols-[1fr_minmax(0,340px)]">
          {openDays.length > 0 && (
            <div className="border border-line bg-[#0e0e10] p-5">
              <h2 className="mb-1 font-display text-2xl uppercase tracking-tight">
                <span className="text-ink">Valendo hoje.</span>{' '}
                <span className="text-accent3">Matchday</span>
              </h2>
              <p className="mb-4 text-sm text-muted">Rodadas abertas — escale e concorra a packs.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {openDays.map(({ run, day }) => (
                  <Link
                    key={day.id}
                    href={`/jogar/matchday/dia/${day.id}`}
                    className="border border-accent3/30 bg-black/40 p-3 transition-colors hover:border-accent3"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      ● aberta
                    </div>
                    <div className="mt-1 truncate text-[13px] font-bold text-white">{run.name}</div>
                    <div className="text-[11px] text-muted">
                      Dia {day.dayNumber} · alvo {day.targetScore} {day.statKey}
                    </div>
                    <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-accent3">
                      Jogar agora →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Link
            href="/fichas"
            className="flex flex-col justify-center bg-sunset p-6 text-center transition-opacity hover:opacity-90"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
              Fichas de Troca
            </div>
            <div className="mt-1 font-display text-[22px] uppercase leading-tight text-white">
              Troque 3 fichas por um pack exclusivo
            </div>
          </Link>
        </section>
      )}
    </main>
  );
}
