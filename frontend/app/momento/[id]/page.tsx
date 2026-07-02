import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getMe,
  getMomentServer,
  getMomentOffersServer,
  getTemplateMarketServer,
  getTemplatesServer,
} from '@/lib/api-server';
import Moment3D from '@/components/Moment3D';
import LanceCard from '@/components/LanceCard';
import OwnershipGauge from '@/components/OwnershipGauge';
import Provenance from '@/components/Provenance';
import MomentActions from '@/components/MomentActions';
import OffersPanel from '@/components/OffersPanel';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Painel colapsável no padrão do print (DETAILS / SALES HISTORY / TOP OFFERS).
function Panel({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-lg border border-line bg-[#0c0813]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-lg uppercase tracking-wide text-ink">{title}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-muted transition-transform group-open:rotate-180" aria-hidden>
          <path d="m12 15.4-6-6L7.4 8l4.6 4.6L16.6 8 18 9.4l-6 6Z" />
        </svg>
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

export default async function MomentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, me, offers] = await Promise.all([getMomentServer(id), getMe(), getMomentOffersServer(id)]);
  if (!m) notFound();
  const t = m.template;
  const [tm, related] = await Promise.all([
    getTemplateMarketServer(t.id),
    getTemplatesServer(`?tier=${t.tier}`),
  ]);

  const meta = TIER_META[t.tier];
  const burned = t.mintedCount - t.circulatingCount;
  const isOwner = !!me && me.username === m.ownerUsername;
  const isLocked = m.locked && !!m.lockedUntil && new Date(m.lockedUntil) > new Date();
  const suggested = tm?.floorCents ?? tm?.aspCents ?? t.aspCents;
  const moreMoments = related.filter((r) => r.id !== t.id).slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      {/* breadcrumb em chips (print d) */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {['Temporada 25/26', t.player.club, t.player.name].map((crumb) => (
          <span key={crumb} className="rounded bg-panel2 px-2.5 py-1 text-[11px] font-semibold text-muted">
            {crumb}
          </span>
        ))}
      </div>

      <div className="mb-10 grid gap-10 md:grid-cols-[minmax(0,380px)_1fr]">
        <div>
          <Moment3D
            data={{
              playerName: t.player.name,
              club: t.player.club,
              jersey: t.player.jersey,
              title: t.title,
              playType: t.playType,
              matchDate: t.matchDate,
              competition: t.competition,
              serialLabel: editionLabel(t, m.serial),
              tierLabel: meta.label,
              tierColor: meta.color,
              trajectory: t.trajectory,
            }}
          />
          <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-muted">
            arraste para girar
          </p>
        </div>

        {/* painel direito (anatomia do print d) */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>
              {meta.label}
            </span>
            <span className="font-mono text-[13px] text-muted">{editionLabel(t, m.serial)}</span>
          </div>
          <h1 className="mt-1 font-display text-4xl uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
            {t.player.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t.title} · {t.playType} · {new Date(t.matchDate).toLocaleDateString('pt-BR')}
          </p>
          {(t.parallel !== 'BASE' || t.badges.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.parallel !== 'BASE' && (
                <span className="rounded bg-panel2 px-2 py-0.5 text-[10px] font-bold uppercase text-ink">{t.parallel}</span>
              )}
              {t.badges.map((b) => (
                <span key={b} className="rounded bg-panel2 px-2 py-0.5 text-[10px] uppercase text-muted">
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5">
            <MomentActions
              momentId={m.id}
              listing={m.listing ?? null}
              isOwner={isOwner}
              isAuthed={!!me}
              isLocked={isLocked}
              isBurned={m.burned}
              lockedUntil={m.lockedUntil ?? null}
              suggestedPriceCents={suggested}
            />
          </div>

          {tm && (
            <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-[#0c0813] py-3 text-center">
              {[
                { label: 'Menor preço', v: tm.floorCents != null ? brl(tm.floorCents) : '—' },
                { label: 'Preço médio', v: brl(tm.aspCents) },
                { label: 'À venda', v: String(tm.activeListings) },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-sm text-ink">{s.v}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
                </div>
              ))}
              {isOwner && tm.recentSales.length > 0 && (
                <div className="col-span-3 mt-3 border-t border-line px-4 pt-3 text-left">
                  <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted">
                    Ajudante de preço · vendas recentes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tm.recentSales.slice(0, 6).map((s, i) => (
                      <span key={i} className="rounded bg-panel2 px-2 py-0.5 font-mono text-[11px] text-accent3">
                        {brl(s.amountCents)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              { label: 'Pontuação wefans', v: m.topShotScore.toLocaleString('pt-BR') },
              { label: 'Adquirido por', v: brl(m.acquiredPriceCents) },
              { label: 'Dono', v: m.ownerUsername ? `@${m.ownerUsername}` : '—' },
              { label: 'Cunhado em', v: dateTime(m.mintedAt).split(',')[0] },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-semibold text-ink">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Panel title="Detalhes">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            {t.player.name} ({t.player.club}, camisa {t.player.jersey}) — {t.title.toLowerCase()} na{' '}
            {t.competition}, temporada 25/26. Lance do tipo {t.playType} registrado em{' '}
            {new Date(t.matchDate).toLocaleDateString('pt-BR')}. Edição{' '}
            {t.editionType === 'LIMITADA' ? `limitada a ${t.editionSize} unidades` : 'circulante'} · exemplar{' '}
            {editionLabel(t, m.serial)}.
          </p>
          <div className="mt-5">
            <OwnershipGauge
              existing={t.mintedCount}
              listed={tm?.activeListings ?? 0}
              locked={tm?.lockedCount ?? 0}
              burned={burned}
            />
          </div>
        </Panel>

        <Panel title="Histórico e procedência">
          <Provenance items={m.provenance ?? []} bare />
        </Panel>

        <Panel title="Ofertas" open={offers.length > 0}>
          <OffersPanel momentId={m.id} isOwner={isOwner} isAuthed={!!me} offers={offers} bare />
        </Panel>
      </div>

      {moreMoments.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
            <span className="text-ink">Mais Lances.</span>{' '}
            <span style={{ color: meta.color }}>{meta.label}s</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {moreMoments.map((r) => (
              <LanceCard key={r.id} template={r} href={`/lance/${r.id}`} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
