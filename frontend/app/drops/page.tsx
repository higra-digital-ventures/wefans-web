import Link from 'next/link';
import { getDropsServer, getPacksServer } from '@/lib/api-server';
import { TIER_META } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { DropSummary, PackDTO, Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendado',
  WAITING: 'Sala de espera',
  LIVE: 'Ao vivo',
  ENDED: 'Encerrado',
};

function OddsChips({ pack }: { pack: PackDTO }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(pack.oddsJson).map(([tier, p]) => {
        const meta = TIER_META[tier as Tier];
        return (
          <span
            key={tier}
            className="rounded-sm px-1.5 py-px text-[9px] font-semibold"
            style={{ background: `${meta.color}1f`, color: meta.color }}
          >
            {meta.label} {(p * 100).toFixed(p * 100 < 1 ? 1 : 0)}%
          </span>
        );
      })}
    </div>
  );
}

// Card de pacote dentro do drop (print f): supply/restantes, pill de reserva, SOLD OUT.
function DropPackCard({ drop, pack }: { drop: DropSummary; pack: PackDTO }) {
  const remaining = pack.totalSupply - pack.soldCount;
  const soldOut = remaining <= 0;
  const reservedPct = Math.round((pack.soldCount / Math.max(1, pack.totalSupply)) * 100);

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-black/50 p-4 backdrop-blur-sm">
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
        <div className="h-14 w-10 shrink-0 rounded-sm bg-sunset shadow-neon" aria-hidden />
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
            className="block rounded bg-white py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-black"
          >
            Ver no mercado
          </Link>
        ) : (
          <Link
            href={`/drop/${drop.id}`}
            className="block rounded bg-accent py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
          >
            {drop.status === 'LIVE' ? `Comprar · ${brl(pack.priceCents)}` : `Entrar na fila · ${brl(pack.priceCents)}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function DropsPage() {
  const [drops, packs] = await Promise.all([getDropsServer(), getPacksServer()]);
  const hero = drops.find((d) => d.status === 'LIVE') ?? drops.find((d) => d.status === 'WAITING');
  const rest = drops.filter((d) => d.id !== hero?.id);
  const ripPacks = packs.filter((p) => p.priceCents > 0 && !p.dropId).slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* hero do drop (print f) */}
      {hero && (
        <section className="relative mb-10 overflow-hidden rounded-xl border border-line">
          <div className="absolute inset-0 bg-sunset opacity-30" aria-hidden />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'radial-gradient(90% 130% at 50% -20%, transparent 20%, #08050c 95%)' }}
          />
          <div className="relative p-6 sm:p-8">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  hero.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-black/40 text-ink'
                }`}
              >
                {STATUS_LABEL[hero.status]}
              </span>
              {hero.requiredCollectorScore > 0 && (
                <span className="text-[11px] text-ink/80">Score do Colecionador mín. {hero.requiredCollectorScore}</span>
              )}
              {hero.hasRebound && <span className="text-[11px] text-accent3">com rebound</span>}
            </div>
            <h1 className="mb-6 max-w-3xl font-display text-4xl uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
              {hero.name}
            </h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {hero.packs.map((p) => (
                <DropPackCard key={p.id} drop={hero} pack={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* demais drops */}
      {rest.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
            <span className="text-ink">Próximos.</span> <span className="text-accent">E anteriores</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((d) => (
              <Link
                key={d.id}
                href={`/drop/${d.id}`}
                className="rounded-lg border border-line bg-[#0c0813] p-4 transition-colors hover:border-[#3a2b52]"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      d.status === 'LIVE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-panel2 text-muted'
                    }`}
                  >
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                  {d.requiredCollectorScore > 0 && (
                    <span className="text-[10px] text-muted">Score mín. {d.requiredCollectorScore}</span>
                  )}
                </div>
                <div className="font-display text-xl uppercase text-ink">{d.name}</div>
                <div className="mt-1.5 text-[11px] text-muted">
                  {d.packs.map((p) => `${p.name} · ${brl(p.priceCents)}`).join('  ·  ')}
                </div>
                {d.packs[0] && (
                  <div className="mt-2">
                    <OddsChips pack={d.packs[0]} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Rip Packs 24/7 (print f) */}
      {ripPacks.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
            <span className="text-ink">Rip Packs.</span> <span className="text-accent3">24/7</span>
          </h2>
          <div className="rounded-lg border border-line bg-[#0c0813] p-5">
            <p className="mb-4 text-sm text-muted">
              A experiência always-on do wefans — abra pacotes a qualquer hora, sem fila.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ripPacks.map((p) => (
                <Link
                  key={p.id}
                  href={`/pacote/${p.id}`}
                  className="group flex items-center gap-3 rounded border border-line bg-black/40 p-3 transition-colors hover:border-[#3a2b52]"
                >
                  <div className="h-12 w-9 shrink-0 rounded-sm bg-sunset transition-transform group-hover:-translate-y-0.5" aria-hidden />
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
    </main>
  );
}
