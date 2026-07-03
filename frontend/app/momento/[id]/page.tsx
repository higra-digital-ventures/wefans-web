import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getMe,
  getMomentServer,
  getMomentOffersServer,
  getTemplateMarketServer,
  getTemplateCollectorsServer,
  getTemplatesServer,
} from '@/lib/api-server';
import Moment3D from '@/components/Moment3D';
import LanceCard from '@/components/LanceCard';
import OwnershipGauge from '@/components/OwnershipGauge';
import Provenance from '@/components/Provenance';
import MomentActions from '@/components/MomentActions';
import OffersPanel from '@/components/OffersPanel';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl, dateTime, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Página do Momento na anatomia completa da Moment page do Top Shot (print de
// referência): breadcrumb em chips · hero com mídia 3D + painel de compra ·
// DETALHES · medidor de propriedade com barras de estado · HISTÓRICO DE VENDAS
// (top + recentes) · estatísticas colapsadas · TOP COLLECTORS + Special Serials ·
// TOP OFFERS · Mais Moments.

function Panel({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border border-line bg-[#0e0e10]">
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

const TH = 'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500';
const TD = 'px-3 py-2.5 text-[12px]';

export default async function MomentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, me, offers] = await Promise.all([getMomentServer(id), getMe(), getMomentOffersServer(id)]);
  if (!m) notFound();
  const t = m.template;
  const [tm, collectors, related] = await Promise.all([
    getTemplateMarketServer(t.id),
    getTemplateCollectorsServer(t.id),
    getTemplatesServer(`?tier=${t.tier}`),
  ]);

  const meta = TIER_META[t.tier];
  const burned = t.mintedCount - t.circulatingCount;
  const listed = tm?.activeListings ?? 0;
  const locked = tm?.lockedCount ?? 0;
  const unlisted = Math.max(0, t.mintedCount - burned - listed - locked);
  const isOwner = !!me && me.username === m.ownerUsername;
  const isLocked = m.locked && !!m.lockedUntil && new Date(m.lockedUntil) > new Date();
  const suggested = tm?.floorCents ?? tm?.aspCents ?? t.aspCents;
  const moreMoments = related.filter((r) => r.id !== t.id).slice(0, 4);

  const topPurchases = [...(tm?.recentSales ?? [])].sort((a, b) => b.amountCents - a.amountCents).slice(0, 3);
  const recentPurchases = (tm?.recentSales ?? []).slice(0, 10);

  // tendência: média das 3 vendas mais recentes vs as 3 anteriores
  const sales = tm?.recentSales ?? [];
  const avg = (xs: { amountCents: number }[]) =>
    xs.length ? xs.reduce((n, x) => n + x.amountCents, 0) / xs.length : 0;
  const trendNow = avg(sales.slice(0, 3));
  const trendBefore = avg(sales.slice(3, 6));
  const trend: 'up' | 'down' | null =
    trendBefore > 0 && Math.abs(trendNow - trendBefore) / trendBefore >= 0.05
      ? trendNow > trendBefore
        ? 'up'
        : 'down'
      : null;

  const STATES = [
    { label: 'Não listados (com donos)', value: unlisted, color: '#f7f7f8' },
    { label: 'À venda (com donos)', value: listed, color: '#22c55e' },
    { label: 'Travados (com donos)', value: locked, color: '#9d4edd' },
    { label: 'Destruídos', value: burned, color: '#ff2e88' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      {/* breadcrumb em chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {[
          { label: `${t.competition} (25/26)`, href: '/mercado' },
          { label: t.player.club, href: `/mercado?q=${encodeURIComponent(t.player.club)}` },
          { label: t.player.name, href: `/mercado?q=${encodeURIComponent(t.player.name)}` },
        ].map((crumb) => (
          <Link
            key={crumb.label}
            href={crumb.href}
            className="bg-panel2 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white"
          >
            {crumb.label}
          </Link>
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

        {/* painel direito: COMUM · #/N → nome → jogada · data → painel de compra */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]">
            <span style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-neutral-400">{editionLabel(t, m.serial)}</span>
          </div>
          <h1 className="mt-1 font-display text-4xl uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
            {t.player.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-300">
            {t.playType} · {new Date(t.matchDate).toLocaleDateString('pt-BR')}
          </p>
          <p className="mt-1 text-sm text-neutral-400">{t.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="bg-panel2 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-300">
              {t.competition} (Temporada 25/26)
            </span>
            {t.parallel !== 'BASE' && (
              <span className="bg-panel2 px-2 py-0.5 text-[10px] font-bold uppercase text-ink">{t.parallel}</span>
            )}
            {t.badges.map((b) => (
              <span key={b} className="bg-panel2 px-2 py-0.5 text-[10px] uppercase text-neutral-400">
                {b}
              </span>
            ))}
          </div>

          {/* painel de compra (Lowest ask + CTA + linha "à venda · média") */}
          <div className="mt-5 border border-line bg-[#0e0e10] p-4">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Menor preço</div>
                <div className="text-[26px] font-bold leading-tight text-white">
                  {tm?.floorCents != null ? brl(tm.floorCents) : '—'}
                </div>
              </div>
              <div className="text-right text-[11px] text-neutral-400">
                {listed} à venda · Média: {tm ? brl(tm.aspCents) : '—'}
                {trend && (
                  <span
                    className={`ml-1 font-bold ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}
                    title={`Tendência: as últimas vendas estão ${trend === 'up' ? 'acima' : 'abaixo'} das anteriores`}
                  >
                    {trend === 'up' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </div>
            <MomentActions
              momentId={m.id}
              listing={m.listing ?? null}
              isOwner={isOwner}
              isAuthed={!!me}
              isLocked={isLocked}
              isBurned={m.burned}
              lockedUntil={m.lockedUntil ?? null}
              suggestedPriceCents={suggested}
              balanceCents={me?.balanceCents ?? null}
              aspCents={tm?.aspCents ?? t.aspCents}
            />
            {isOwner && tm && tm.recentSales.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <div className="mb-1.5 text-[10px] uppercase tracking-widest text-neutral-500">
                  Ajudante de preço · vendas recentes
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tm.recentSales.slice(0, 6).map((s, i) => (
                    <span key={i} className="bg-panel2 px-2 py-0.5 font-mono text-[11px] text-accent3">
                      {brl(s.amountCents)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              { label: 'Pontuação wefans', v: m.topShotScore.toLocaleString('pt-BR') },
              { label: 'Adquirido por', v: brl(m.acquiredPriceCents) },
              { label: 'Dono', v: m.ownerUsername ? `@${m.ownerUsername}` : '—' },
              { label: 'Criado em', v: dateTime(m.mintedAt).split(',')[0] },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-semibold text-ink">
                  {s.v.startsWith('@') ? (
                    <Link href={`/u/${s.v.slice(1)}`} className="hover:underline">
                      {s.v}
                    </Link>
                  ) : (
                    s.v
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Panel title="Detalhes">
          <p className="max-w-3xl text-sm leading-relaxed text-neutral-300">
            {t.player.name} ({t.player.club}, camisa {t.player.jersey}) — {t.title.toLowerCase()} na{' '}
            {t.competition}, temporada 25/26. Lance do tipo {t.playType} registrado em{' '}
            {new Date(t.matchDate).toLocaleDateString('pt-BR')}. Edição{' '}
            {t.editionType === 'LIMITADA' ? `limitada a ${t.editionSize} unidades` : 'circulante'} · exemplar{' '}
            {editionLabel(t, m.serial)}.
          </p>

          {/* medidor + barras de estado (anatomia do print: arco à esquerda, estados à direita) */}
          <div className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
            <div>
              <OwnershipGauge existing={t.mintedCount} listed={listed} locked={locked} burned={burned} legend={false} />
              <p className="-mt-1 text-center text-[11px] text-neutral-400">
                <Link href={`/lance/${t.id}`} className="underline underline-offset-2 hover:text-white">
                  Ver todos os Moments da edição
                </Link>
              </p>
            </div>
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                {STATES.map((s) => (
                  <div key={s.label} className="flex items-stretch gap-2.5 bg-[#121214] px-3 py-2.5">
                    <span className="w-[3px] shrink-0" style={{ background: s.color }} aria-hidden />
                    <span>
                      <span className="block text-[15px] font-bold leading-tight text-white">
                        {s.value.toLocaleString('pt-BR')}
                      </span>
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        {s.label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-right text-[10px] text-neutral-600">atualiza conforme o mercado</p>
            </div>
          </div>
        </Panel>

        <Panel title="Histórico de vendas">
          {topPurchases.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma venda desta edição ainda.</p>
          ) : (
            <>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Maiores compras
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Comprador</th>
                    <th className={TH}>Preço</th>
                    <th className={TH}>Serial</th>
                    <th className={TH}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {topPurchases.map((s, i) => (
                    <tr key={`top-${i}`} className="border-b border-line/50">
                      <td className={`${TD} text-white`}>{s.buyer ? `@${s.buyer}` : '—'}</td>
                      <td className={`${TD} font-bold text-emerald-300`}>{brl(s.amountCents)}</td>
                      <td className={TD}>
                        <span className="mr-2 bg-white px-1.5 py-px text-[9px] font-bold uppercase text-black">
                          #{i + 1} maior venda
                        </span>
                        <span className="font-mono text-neutral-300">#{s.serial}</span>
                      </td>
                      <td className={`${TD} text-neutral-400`} title={dateTime(s.createdAt)}>
                        {timeAgo(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mb-1 mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Compras recentes
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Comprador</th>
                    <th className={TH}>Preço</th>
                    <th className={TH}>Serial</th>
                    <th className={TH}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.map((s, i) => (
                    <tr key={`rec-${i}`} className="border-b border-line/50">
                      <td className={`${TD} text-white`}>{s.buyer ? `@${s.buyer}` : '—'}</td>
                      <td className={`${TD} font-semibold text-ink`}>{brl(s.amountCents)}</td>
                      <td className={`${TD} font-mono text-neutral-300`}>#{s.serial}</td>
                      <td className={`${TD} text-neutral-400`} title={dateTime(s.createdAt)}>
                        {timeAgo(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-center">
                <Link
                  href="/mercado/atividade"
                  className="inline-block border border-white/25 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:bg-white/10"
                >
                  Ver histórico completo
                </Link>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Estatísticas do lance" open={false}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              { label: 'Tipo de jogada', v: t.playType },
              { label: 'Competição', v: t.competition },
              { label: 'Data da partida', v: new Date(t.matchDate).toLocaleDateString('pt-BR') },
              { label: 'Selos', v: t.badges.length > 0 ? t.badges.join(', ') : '—' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-semibold text-ink">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Estatísticas do jogador" open={false}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              { label: 'Clube', v: t.player.club },
              { label: 'Posição', v: t.player.position },
              { label: 'Camisa', v: `#${t.player.jersey}` },
              { label: 'Nacionalidade', v: t.player.nationality },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-semibold text-ink">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </Panel>

        {collectors && (collectors.topCollectors.length > 0 || collectors.specialSerials.length > 0) && (
          <Panel title="Top colecionadores">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  <span>Mais exemplares</span>
                  <span className="font-normal normal-case tracking-normal text-neutral-500">#Moments</span>
                </div>
                <ol className="divide-y divide-line/50">
                  {collectors.topCollectors.map((c, i) => (
                    <li key={c.username} className="flex items-center gap-3 py-2.5">
                      <span className="w-8 text-[11px] font-bold uppercase text-neutral-500">{i + 1}º</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sunset text-[10px] font-bold uppercase text-white">
                        {c.username[0]}
                      </span>
                      <Link href={`/u/${c.username}`} className="text-[13px] font-semibold text-white hover:underline">
                        @{c.username}
                      </Link>
                      <span className="ml-auto font-mono text-[12px] text-neutral-300">{c.count}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-[#121214] p-4">
                <div className="mb-2 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  <span>Serials especiais</span>
                  <span className="font-normal normal-case tracking-normal text-neutral-500">Dono</span>
                </div>
                {collectors.specialSerials.length === 0 ? (
                  <p className="text-sm text-neutral-500">Nenhum serial especial criado ainda.</p>
                ) : (
                  <ul className="divide-y divide-line/50">
                    {collectors.specialSerials.map((s) => (
                      <li key={s.serial} className="flex items-center gap-3 py-2.5">
                        <Link
                          href={`/momento/${s.momentId}`}
                          className="bg-panel2 px-2 py-0.5 font-mono text-[12px] font-bold text-accent3 hover:text-white"
                        >
                          #{s.serial}
                        </Link>
                        <span className="text-[11px] text-neutral-400">{s.label}</span>
                        <span className="ml-auto text-[12px]">
                          {s.burned ? (
                            <span className="text-neutral-500">destruído</span>
                          ) : s.owner ? (
                            <Link href={`/u/${s.owner}`} className="font-semibold text-white hover:underline">
                              @{s.owner}
                            </Link>
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Maiores ofertas" open={offers.length > 0}>
          <OffersPanel momentId={m.id} isOwner={isOwner} isAuthed={!!me} offers={offers} bare />
        </Panel>

        <Panel title="Histórico e procedência" open={false}>
          <Provenance items={m.provenance ?? []} bare />
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
