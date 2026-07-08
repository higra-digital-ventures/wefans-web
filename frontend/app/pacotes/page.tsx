import Link from 'next/link';
import Countdown from '@/components/Countdown';
import PackCard from '@/components/PackCard';
import MomentCard from '@/components/MomentCard';
import TacticalBoard from '@/components/TacticalBoard';
import {
  getDropsServer,
  getDropServer,
  getPacksServer,
  getTemplatesServer,
  getMe,
} from '@/lib/api-server';
import { TIER_META, TIER_ORDER, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendado',
  WAITING: 'Sala de espera',
  LIVE: 'Ao vivo',
  ENDED: 'Encerrado',
};

// Landing de Pacotes na anatomia do NBA Top Shot: hero do drop em destaque,
// fileira de packs do drop, Loja 24/7, carrossel de "Grails" e tiles promocionais.
export default async function PacotesPage() {
  const [drops, packs, rares, me] = await Promise.all([
    getDropsServer().catch(() => []),
    getPacksServer().catch(() => []),
    getTemplatesServer().catch(() => []),
    getMe(),
  ]);

  const hero =
    drops.find((d) => d.status === 'LIVE') ??
    drops.find((d) => d.status === 'WAITING') ??
    drops.find((d) => d.status !== 'ENDED') ??
    null;
  const heroDetail = hero ? await getDropServer(hero.id).catch(() => null) : null;
  const heroPacks = heroDetail?.packs ?? hero?.packs ?? [];
  const myScore = me?.collectorScore ?? null;

  // "Grails": os Momentos mais raros/valiosos do catálogo
  const grails = [...rares]
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || b.aspCents - a.aspCents)
    .slice(0, 8);

  const heroAccent = heroPacks[0] ? TIER_META[heroPacks[0].guaranteeTier ?? 'LENDARIO'].color : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* ===== HERO do drop em destaque ===== */}
      {hero ? (
        <section className="relative mb-10 overflow-hidden rounded-2xl border border-line">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'linear-gradient(120deg, #2a1c07 0%, #0a0a0b 55%, #1a0b2e 100%)' }}
          />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'radial-gradient(90% 130% at 50% -20%, rgba(255,158,44,.18) 0%, transparent 60%)' }}
          />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="flex flex-col justify-center">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    hero.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
                  }`}
                >
                  {hero.status === 'LIVE' ? '● Ao vivo' : hero.status === 'WAITING' ? 'Sala de espera aberta' : 'Em breve'}
                </span>
                {hero.hasRebound && <span className="text-[11px] text-accent3">com repescagem</span>}
              </div>
              <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
                {hero.name}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-300">
                Lançamento com fila: entre na sala de espera, receba uma posição aleatória e uma janela de 20 minutos
                para comprar. {hero.hasRebound ? 'Quem fica de fora tenta a repescagem.' : ''}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-200">
                <span className="text-neutral-500">
                  {hero.status === 'LIVE' ? 'Termina em' : hero.status === 'WAITING' ? 'Compra abre em' : 'Sala abre em'}
                </span>
                <span className="font-bold text-amber-300">
                  <Countdown
                    until={hero.status === 'LIVE' ? hero.endsAt : hero.status === 'WAITING' ? hero.startsAt : hero.waitingRoomOpensAt}
                    endedLabel="a qualquer momento"
                  />
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/drop/${hero.id}`}
                  className="rounded-lg bg-accent px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
                >
                  {hero.status === 'LIVE' ? 'Comprar packs' : 'Entrar na sala de espera'}
                </Link>
                <span
                  className="text-[11px] font-semibold text-neutral-400"
                  title="Score do Colecionador exigido para este drop"
                >
                  {hero.requiredCollectorScore > 0
                    ? `Exige Score ${hero.requiredCollectorScore.toLocaleString('pt-BR')}${
                        myScore != null ? ` · você tem ${myScore.toLocaleString('pt-BR')}` : ''
                      }`
                    : 'Aberto a todos'}
                </span>
              </div>
            </div>

            {/* vitrine: prévia dos Momentos possíveis do drop (os "grails" do pack) */}
            {grails.length > 0 && (
              <div className="grid grid-cols-2 gap-3 self-center">
                {grails.slice(0, 4).map((t) => {
                  const m = TIER_META[t.tier];
                  return (
                    <div
                      key={t.id}
                      className="aspect-[4/5] overflow-hidden rounded-lg border"
                      style={{ borderColor: `${m.color}66`, boxShadow: `0 0 20px ${m.color}30` }}
                    >
                      <TacticalBoard trajectory={t.trajectory} jersey={t.player.jersey} color={m.color} foil={isFoil(t.tier)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <header className="mb-8">
          <h1 className="font-display text-4xl uppercase text-ink">Pacotes</h1>
          <p className="text-muted">Compre, abra e revele Momentos numerados.</p>
        </header>
      )}

      {/* ===== fileira de packs do drop em destaque ===== */}
      {hero && heroPacks.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl uppercase tracking-tight text-ink">Packs do drop</h2>
            <Link href={`/drop/${hero.id}`} className="text-[12px] font-semibold text-accent3 hover:underline">
              ver o drop →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroPacks.map((p) => {
              const remaining = p.totalSupply - p.soldCount;
              const soldOut = remaining <= 0;
              const pct = Math.round((p.soldCount / Math.max(1, p.totalSupply)) * 100);
              const accent = heroAccent ?? '#ff9e2c';
              return (
                <div
                  key={p.id}
                  className="rounded-2xl relative overflow-hidden border border-line bg-[#0e0e10] p-5"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-1"
                    style={{ background: `linear-gradient(90deg, ${accent}, transparent 80%)` }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg text-ink">{p.name}</div>
                      <div className="text-[11px] text-muted">
                        {p.momentCount} Momentos · Supply {p.totalSupply.toLocaleString('pt-BR')}
                      </div>
                      {p.setName && <div className="mt-0.5 text-[11px] text-neutral-500">Coleção {p.setName}</div>}
                    </div>
                    <span className="shrink-0 rounded-full bg-panel2 px-2.5 py-1 text-sm font-semibold tabular-nums text-accent3">
                      {brl(p.priceCents)}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: accent }} />
                  </div>
                  <div className="mt-1 text-right text-[10px] tabular-nums text-neutral-500">{pct}% reservado</div>
                  <Link
                    href={soldOut ? '/mercado/pacotes' : `/drop/${hero.id}`}
                    className={`rounded-lg mt-3 block py-2.5 text-center text-[12px] font-bold uppercase tracking-[0.06em] ${
                      soldOut ? 'bg-white text-black' : 'bg-accent text-white transition-opacity hover:opacity-90'
                    }`}
                  >
                    {soldOut
                      ? 'Ver no mercado'
                      : hero.status === 'LIVE'
                        ? `Comprar · ${brl(p.priceCents)}`
                        : `Entrar na fila · ${brl(p.priceCents)}`}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Loja 24/7 (packs always-on) ===== */}
      {packs.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-2xl uppercase tracking-tight text-ink">Loja 24/7</h2>
            <span className="text-[12px] text-muted">sempre à venda, sem fila</span>
            <Link href="/mercado/pacotes" className="ml-auto text-[12px] font-semibold text-accent3 hover:underline">
              Revenda de pacotes →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((p) => (
              <PackCard key={p.id} pack={p} />
            ))}
          </div>
        </section>
      )}

      {/* ===== Grails: top collectibles (carrossel) ===== */}
      {grails.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl uppercase tracking-tight">
              <span className="text-ink">Grails.</span> <span className="text-neutral-500">Top colecionáveis</span>
            </h2>
            <Link href="/mercado" className="text-[12px] font-semibold text-accent3 hover:underline">
              ir ao mercado →
            </Link>
          </div>
          <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {grails.map((t) => (
              <div key={t.id} className="w-[240px] shrink-0">
                <MomentCard template={t} href={`/moment/${t.id}`} stillMedia />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== tiles promocionais (2x2, estilo Top Shot) ===== */}
      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <PromoTile
          href="/mercado/pacotes"
          title="Todos os packs"
          subtitle="Compre e venda packs lacrados"
          from="#1a0b2e"
          to="#3a1e6e"
          cta="Ver revenda de pacotes"
        />
        <PromoTile
          href="/mercado"
          title="Explore o mercado"
          subtitle="Ache seu próximo Momento"
          from="#3a0a1e"
          to="#7a1030"
          cta="Buscar Momentos"
        />
        <PromoTile
          href="/jogar/matchday"
          title="Fast Break"
          subtitle="Escale e ganhe prêmios"
          from="#07231a"
          to="#0f5a3a"
          cta="Montar escalação"
        />
        <PromoTile
          href="/jogar/rankings"
          title="Ganhe pontos"
          subtitle="Colecione e concorra a prêmios"
          from="#1a1030"
          to="#4a1e8e"
          cta="Ver progresso"
        />
      </section>
    </main>
  );
}

function PromoTile({
  href,
  title,
  subtitle,
  from,
  to,
  cta,
}: {
  href: string;
  title: string;
  subtitle: string;
  from: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl group relative flex min-h-[180px] flex-col justify-between overflow-hidden border border-white/10 p-6 transition-transform hover:-translate-y-0.5"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div>
        <div className="font-display text-3xl uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">
          {title}
        </div>
        <div className="mt-1 text-[13px] font-semibold text-white/80">{subtitle}</div>
      </div>
      <span className="rounded-lg inline-block w-fit border border-white/40 bg-black/20 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition-colors group-hover:bg-white/15">
        {cta} →
      </span>
    </Link>
  );
}
