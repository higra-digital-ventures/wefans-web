import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getMe,
  getMomentServer,
  getMomentOffersServer,
  getTemplateMarketServer,
} from '@/lib/api-server';
import Moment3D from '@/components/Moment3D';
import OwnershipGauge from '@/components/OwnershipGauge';
import Provenance from '@/components/Provenance';
import MomentActions from '@/components/MomentActions';
import OffersPanel from '@/components/OffersPanel';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MomentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, me, offers] = await Promise.all([getMomentServer(id), getMe(), getMomentOffersServer(id)]);
  if (!m) notFound();
  const t = m.template;
  const tm = await getTemplateMarketServer(t.id);

  const meta = TIER_META[t.tier];
  const burned = t.mintedCount - t.circulatingCount;
  const isOwner = !!me && me.username === m.ownerUsername;
  const isLocked = m.locked && !!m.lockedUntil && new Date(m.lockedUntil) > new Date();
  const suggested = tm?.floorCents ?? tm?.aspCents ?? t.aspCents;

  const stat = (label: string, value: string) => (
    <div>
      <div className="font-display text-xl text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Temporada 1</span>
        <span>·</span>
        <span>{t.player.club}</span>
        <span>·</span>
        <Link href={`/lance/${t.id}`} className="hover:text-ink">
          ver edição
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
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
          <p className="mt-2 text-center text-[11px] text-muted">arraste para girar o 3D Moment</p>
        </div>

        <div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase"
            style={{ background: `${meta.color}26`, color: meta.color }}
          >
            {meta.label}
          </span>
          <h1 className="mt-2 font-display text-4xl uppercase text-ink">{t.player.name}</h1>
          <p className="text-muted">
            {t.title} · {t.playType} · {new Date(t.matchDate).toLocaleDateString('pt-BR')}
          </p>
          <div className="mt-3 font-mono text-2xl text-ink">{editionLabel(t, m.serial)}</div>

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

          {/* Mercado da edição + ajudante de preço */}
          {tm && (
            <div className="mt-4 grid grid-cols-3 gap-4 rounded-2xl border border-line bg-panel p-4 text-sm">
              <div>
                <div className="font-mono text-ink">{tm.floorCents != null ? brl(tm.floorCents) : '—'}</div>
                <div className="text-xs text-muted">Menor preço</div>
              </div>
              <div>
                <div className="font-mono text-ink">{brl(tm.aspCents)}</div>
                <div className="text-xs text-muted">Preço médio</div>
              </div>
              <div>
                <div className="font-mono text-ink">{tm.activeListings}</div>
                <div className="text-xs text-muted">À venda</div>
              </div>
              {isOwner && tm.recentSales.length > 0 && (
                <div className="col-span-3 border-t border-line pt-3">
                  <div className="mb-1 text-xs uppercase tracking-widest text-muted">
                    Ajudante de preço · vendas recentes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tm.recentSales.slice(0, 6).map((s, i) => (
                      <span key={i} className="rounded bg-panel2 px-2 py-0.5 font-mono text-xs text-accent3">
                        {brl(s.amountCents)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
            {stat('Pontuação wefans', m.topShotScore.toLocaleString('pt-BR'))}
            {stat('Adquirido por', brl(m.acquiredPriceCents))}
            {stat('Dono', m.ownerUsername ? `@${m.ownerUsername}` : '—')}
            {stat('Cunhado em', dateTime(m.mintedAt).split(',')[0])}
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Propriedade da edição
            </h2>
            <OwnershipGauge
              existing={t.mintedCount}
              listed={tm?.activeListings ?? 0}
              locked={tm?.lockedCount ?? 0}
              burned={burned}
            />
          </div>

          <OffersPanel momentId={m.id} isOwner={isOwner} isAuthed={!!me} offers={offers} />

          <Provenance items={m.provenance ?? []} />
        </div>
      </div>
    </main>
  );
}
