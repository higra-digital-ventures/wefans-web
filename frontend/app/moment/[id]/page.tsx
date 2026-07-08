import Icon from '@/components/Icon';
import Term from '@/components/Term';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getMe,
  getMomentServer,
  getMomentOffersServer,
  getTemplateServer,
  getTemplateMarketServer,
  getTemplateCollectorsServer,
  getTemplatesServer,
  getCollectionServer,
} from '@/lib/api-server';
import Moment3D from '@/components/Moment3DLazy';
import MomentCard from '@/components/MomentCard';
import OwnershipGauge from '@/components/OwnershipGauge';
import MomentActions from '@/components/MomentActions';
import OffersPanel from '@/components/OffersPanel';
import ShareButton from '@/components/ShareButton';
import WishlistButton from '@/components/WishlistButton';
import { TIER_META, editionLabel, isFoil } from '@/lib/tiers';
import { brl, compact, dateTime, timeAgo } from '@/lib/format';
import { clubCrestUrl } from '@/lib/media';
import type { MomentDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

// A página do Momento (modelo Top Shot: uma página por jogada). É keyed pela
// EDIÇÃO (template): mostra o cubo/vídeo, o menor preço à venda com compra
// direta do floor, todos os seriais, colecionadores e histórico — e, se o
// usuário logado tiver exemplares desta edição, uma seção para vendê-los.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemplateServer(id);
  if (!t) return { title: 'Momento' };
  return {
    title: `${t.player.name} — ${t.title}`,
    description: `${t.playType} · ${t.competition} · edição ${t.editionType === 'LIMITADA' ? `limitada /${t.editionSize}` : 'circulante'} no wefans.`,
  };
}

function Panel({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl group border border-line bg-[#0e0e10]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-lg uppercase tracking-wide text-ink">{title}</span>
        <Icon name="chevronDown" size={16} className="text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

// Analytics: linha de preço das vendas (ordem cronológica) — SVG sem JS
function PriceSparkline({ sales }: { sales: { amountCents: number; createdAt: string }[] }) {
  if (sales.length < 2) return null;
  const pts = [...sales].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((s) => s.amountCents);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const W = 560;
  const H = 120;
  const x = (i: number) => (i / (pts.length - 1)) * (W - 16) + 8;
  const y = (v: number) => (max === min ? H / 2 : H - 14 - ((v - min) / (max - min)) * (H - 28));
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const up = pts[pts.length - 1] >= pts[0];
  const color = up ? '#22c55e' : '#ff2e88';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histórico de preço">
      <path d={`${d} L${x(pts.length - 1)},${H - 4} L8,${H - 4} Z`} fill={`${color}18`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill={color} />
      ))}
    </svg>
  );
}

const TH = 'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500';
const TD = 'px-3 py-2.5 text-[12px]';

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // id = template (edição)
  const [t, me, tm, collectors, related] = await Promise.all([
    getTemplateServer(id),
    getMe(),
    getTemplateMarketServer(id),
    getTemplateCollectorsServer(id),
    getTemplatesServer(),
  ]);
  if (!t) notFound();

  const floorMomentId = tm?.floorMomentId ?? null;
  // exemplar do menor preço → alvo da compra direta (Top Shot: buy the floor)
  const floorM = floorMomentId ? await getMomentServer(floorMomentId).catch(() => null) : null;
  const offers = floorMomentId ? await getMomentOffersServer(floorMomentId).catch(() => []) : [];

  // exemplares do usuário logado nesta edição → seção "Seus exemplares" (vender)
  let myMoments: MomentDTO[] = [];
  if (me) {
    const col = await getCollectionServer().catch(() => null);
    const mine = (col ?? []).filter((mm) => mm.template.id === id);
    myMoments = (
      await Promise.all(mine.map((mm) => getMomentServer(mm.id).catch(() => null)))
    ).filter((mm): mm is MomentDTO => !!mm);
  }

  const meta = TIER_META[t.tier];
  const burned = t.mintedCount - t.circulatingCount;
  const listed = tm?.activeListings ?? 0;
  const locked = tm?.lockedCount ?? 0;
  const unlisted = Math.max(0, t.mintedCount - burned - listed - locked);
  const suggested = tm?.floorCents ?? tm?.aspCents ?? t.aspCents;
  const moreMoments = related.filter((r) => r.id !== t.id && r.tier === t.tier).slice(0, 4);

  const floorIsMine = !!me && floorM?.ownerUsername === me.username;

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
    { label: 'Burned', value: burned, color: '#ff2e88' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      {/* breadcrumb em chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {[
          { label: `${t.competition} (2025)`, href: '/mercado' },
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
            key={t.id}
            data={{
              playerName: t.player.name,
              club: t.player.club,
              jersey: t.player.jersey,
              title: t.title,
              playType: t.playType,
              matchDate: t.matchDate,
              competition: t.competition,
              serialLabel: editionLabel(t),
              tierLabel: meta.label,
              tierColor: meta.color,
              trajectory: t.trajectory,
              photoUrl: t.player.photoUrl,
              videoUrl: t.videoUrl,
              crestUrl: clubCrestUrl(t.player.club),
              foil: isFoil(t.tier),
              stats: [
                { label: 'Supply', value: compact(t.circulatingCount) },
                { label: 'Burned', value: compact(burned) },
                { label: 'À venda', value: String(listed) },
                { label: 'Média', value: t.aspCents > 0 ? brl(t.aspCents) : '—' },
                { label: 'Jogada', value: t.playType },
                { label: 'Donos únicos', value: String(collectors?.topCollectors.length ?? 0) + '+' },
              ],
            }}
          />
        </div>

        {/* painel direito: tier · edição → nome → jogada · data → painel de compra (floor) */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]">
            <span style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-neutral-400">{editionLabel(t)}</span>
            <span className="ml-auto">
              <ShareButton title={`${t.player.name} ${editionLabel(t)} — wefans`} />
            </span>
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
              {t.competition} (2025)
            </span>
            {t.setName && (
              <span className="bg-panel2 px-2 py-0.5 text-[10px] font-bold uppercase text-accent3" title={t.seriesName ? `Coleção ${t.setName} · ${t.seriesName}` : `Coleção ${t.setName}`}>
                Set {t.setName}
              </span>
            )}
            {t.parallel !== 'BASE' && (
              <span className="bg-panel2 px-2 py-0.5 text-[10px] font-bold uppercase text-ink">{t.parallel}</span>
            )}
            {t.badges.map((b) => (
              <span key={b} className="bg-panel2 px-2 py-0.5 text-[10px] uppercase text-neutral-400">
                {b}
              </span>
            ))}
          </div>

          {/* cerimônia de encerramento: supply congelado é argumento de valorização */}
          {t.emissionClosed && (
            <div className="mt-3 inline-flex items-center gap-2 border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300">
              <Icon name="lock" size={13} />
              Emissão encerrada · supply congelado em {t.circulatingCount.toLocaleString('pt-BR')}
            </div>
          )}

          {/* painel de compra: menor preço + compra direta do floor */}
          <div className="rounded-2xl mt-5 border border-line bg-[#0e0e10] p-4">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">Menor preço</div>
                <div className="text-[26px] font-bold leading-tight text-white">
                  {tm?.floorCents != null ? brl(tm.floorCents) : '—'}
                </div>
                {(() => {
                  const floorC = tm?.floorCents;
                  const asp = tm?.aspCents ?? 0;
                  if (floorC == null || asp <= 0) return null;
                  const pct = Math.round(((floorC - asp) / asp) * 100);
                  if (Math.abs(pct) < 5) return null;
                  return (
                    <div
                      className={`text-[11px] font-bold tabular-nums ${pct < 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      title={`Diferença do menor preço para a média das vendas (${brl(asp)})`}
                    >
                      {pct > 0 ? '+' : ''}
                      {pct}% vs média
                    </div>
                  );
                })()}
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

            {floorMomentId ? (
              <MomentActions
                momentId={floorMomentId}
                listing={floorM?.listing ?? null}
                isOwner={floorIsMine}
                isAuthed={!!me}
                isLocked={false}
                isBurned={false}
                lockedUntil={null}
                suggestedPriceCents={suggested}
                balanceCents={me?.balanceCents ?? null}
                aspCents={tm?.aspCents ?? t.aspCents}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-neutral-400">
                  Nenhum exemplar à venda no momento. Consiga um nos pacotes ou faça uma oferta.
                </p>
                <Link
                  href="/pacotes"
                  className="rounded-lg inline-block bg-accent px-5 py-2.5 font-semibold text-white"
                >
                  Conseguir nos pacotes
                </Link>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
              <WishlistButton templateId={t.id} canWish={!!me} initialWished={false} />
              {floorIsMine && (
                <a href="#exemplares" className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent3 hover:text-white">
                  Gerenciar seus exemplares ↓
                </a>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              { label: 'Supply', v: compact(t.circulatingCount) },
              { label: 'À venda', v: String(listed) },
              { label: 'Média', v: t.aspCents > 0 ? brl(t.aspCents) : '—' },
              { label: 'Colecionadores', v: String(collectors?.topCollectors.length ?? 0) + '+' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-semibold text-ink">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seus exemplares desta edição: vender / cancelar / presentear por serial */}
      {myMoments.length > 0 && (
        <section id="exemplares" className="mb-10 scroll-mt-24">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
            <span className="text-ink">Seus exemplares.</span>{' '}
            <span className="text-neutral-500 text-lg">{myMoments.length} nesta edição</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myMoments.map((mm) => {
              const mmLocked = !!mm.locked && !!mm.lockedUntil && new Date(mm.lockedUntil) > new Date();
              return (
                <div key={mm.id} className="rounded-2xl border border-line bg-[#0e0e10] p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.15em]">
                    <span className="tabular-nums text-accent3">{editionLabel(t, mm.serial)}</span>
                    <span className="text-neutral-500">Pontuação {mm.topShotScore.toLocaleString('pt-BR')}</span>
                  </div>
                  <MomentActions
                    momentId={mm.id}
                    listing={mm.listing ?? null}
                    isOwner
                    isAuthed
                    isLocked={mmLocked}
                    isBurned={mm.burned}
                    lockedUntil={mm.lockedUntil ?? null}
                    suggestedPriceCents={suggested}
                    balanceCents={me?.balanceCents ?? null}
                    aspCents={tm?.aspCents ?? t.aspCents}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-4">
        <Panel title="Detalhes">
          <p className="max-w-3xl text-sm leading-relaxed text-neutral-300">
            {t.player.name} ({t.player.club}, camisa {t.player.jersey}) — {t.title.toLowerCase()} na{' '}
            {t.competition}, temporada 25/26. Momento do tipo {t.playType} registrado em{' '}
            {new Date(t.matchDate).toLocaleDateString('pt-BR')}. Edição{' '}
            {t.editionType === 'LIMITADA' ? `limitada a ${t.editionSize} unidades` : 'circulante'} ·{' '}
            {editionLabel(t)}.
          </p>

          {/* medidor + barras de estado */}
          <div className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
            <div>
              <OwnershipGauge existing={t.mintedCount} listed={listed} locked={locked} burned={burned} legend={false} />
            </div>
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                {STATES.map((s) => (
                  <div key={s.label} className="flex items-stretch gap-2.5 bg-[#121214] px-3 py-2.5">
                    <span className="w-[3px] shrink-0" style={{ background: s.color }} aria-hidden />
                    <span>
                      <span
                        className="block text-[15px] font-bold leading-tight text-white"
                        title={s.value.toLocaleString('pt-BR')}
                      >
                        {compact(s.value)}
                      </span>
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        {s.label === 'Burned' ? <Term id="acoes">Burned</Term> : s.label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-right text-[10px] text-neutral-600">atualiza a cada 2 min · conforme o mercado</p>
            </div>
          </div>
        </Panel>

        {tm && tm.recentSales.length >= 2 && (
          <Panel title="Analytics" open={false}>
            <div className="mb-2 flex items-baseline justify-between text-[11px] text-neutral-400">
              <span>Preço das últimas {tm.recentSales.length} vendas</span>
              <span>
                mín {brl(Math.min(...tm.recentSales.map((v) => v.amountCents)))} · máx{' '}
                {brl(Math.max(...tm.recentSales.map((v) => v.amountCents)))}
              </span>
            </div>
            <PriceSparkline sales={tm.recentSales} />
          </Panel>
        )}

        <Panel title="Histórico de vendas">
          {topPurchases.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma venda desta edição ainda.</p>
          ) : (
            <>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Maiores compras
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Comprador</th>
                    <th className={TH}>Preço</th>
                    <th className={TH}>Serial</th>
                    <th className={TH}>Data</th>
                    <th className={TH}>TX</th>
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
                      <td className={TD}>
                        <span className="cursor-help text-neutral-600" title="Registro on-chain em breve (OwnershipProvider)">⛓</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>

              <div className="mb-1 mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Compras recentes
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Comprador</th>
                    <th className={TH}>Preço</th>
                    <th className={TH}>Serial</th>
                    <th className={TH}>Data</th>
                    <th className={TH}>TX</th>
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
                      <td className={TD}>
                        <span className="cursor-help text-neutral-600" title="Registro on-chain em breve (OwnershipProvider)">⛓</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
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

        {collectors && collectors.topCollectors.length > 0 && (
          <Panel title="Top colecionadores">
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
                  <span className="ml-auto tabular-nums text-[12px] text-neutral-300">{c.count}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        {/* todos os exemplares: serial → dono → preço (sem página por serial: exibição) */}
        {collectors && collectors.serials.length > 0 && (
          <Panel title="Exemplares da edição" open={false}>
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {collectors.serials.map((s) => (
                <li
                  key={s.serial}
                  className="rounded-2xl flex items-center gap-3 border border-white/10 bg-[#0a0a0b] px-3 py-2"
                >
                  <span className="tabular-nums text-[13px] font-bold text-accent3">#{s.serial}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-300">
                    {s.burned ? (
                      <span className="text-neutral-500">destruído</span>
                    ) : s.owner ? (
                      <Link href={`/u/${s.owner}`} className="hover:underline">
                        @{s.owner}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </span>
                  {s.listedCents != null && (
                    <span className="shrink-0 text-[11px] font-bold text-emerald-300">
                      à venda · {brl(s.listedCents)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {floorMomentId && (
          <Panel title="Maiores ofertas" open={offers.length > 0}>
            <OffersPanel
              momentId={floorMomentId}
              isOwner={floorIsMine}
              isAuthed={!!me}
              offers={offers}
              balanceCents={me?.balanceCents ?? null}
              bare
            />
          </Panel>
        )}
      </div>

      {moreMoments.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">
            <span className="text-ink">Mais Momentos.</span>{' '}
            <span style={{ color: meta.color }}>{meta.label}s</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {moreMoments.map((r) => (
              <MomentCard key={r.id} template={r} href={`/moment/${r.id}`} />
            ))}
          </div>
        </section>
      )}

      {/* CTA sticky no mobile: o menor preço e a compra nunca somem no scroll */}
      {tm?.floorCents != null && !floorIsMine && (
        <div className="fixed inset-x-0 bottom-14 z-30 flex items-center justify-between gap-3 border-t border-white/15 bg-[#0a0a0b]/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-neutral-500">Menor preço</div>
            <div className="font-display text-xl leading-none text-white">{brl(tm.floorCents)}</div>
          </div>
          <a
            href="#top"
            className="rounded-lg bg-accent px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-white"
          >
            Comprar
          </a>
        </div>
      )}
    </main>
  );
}
