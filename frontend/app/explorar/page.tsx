import Link from 'next/link';
import { getFeedServer, getWishlistServer, getChecklistsServer, getMe } from '@/lib/api-server';
import SubTabs from '@/components/SubTabs';
import EmptyState from '@/components/EmptyState';
import FeedPoller from '@/components/FeedPoller';
import TacticalBoard from '@/components/TacticalBoard';
import { TIER_META, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { FeedEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Explorar = feed social de eventos da economia (gramática do Explore do Top Shot):
// rail pessoal à esquerda (perto de completar + wishlist) e stream central com
// compras, aberturas de pacote, desafios, missões, presentes, queimas e check-ins.

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

const ACTION: Record<FeedEvent['kind'], string> = {
  SALE: 'comprou',
  LIST: 'colocou à venda',
  PACK_OPEN: 'abriu um pacote e puxou',
  GIFT: 'recebeu de presente',
  BURN: 'queimou',
  CHALLENGE: 'completou o desafio',
  QUEST: 'completou a missão',
  CHECKIN: 'fez check-in em',
};

function MomentThumb({ e }: { e: FeedEvent }) {
  if (!e.template) return null;
  const meta = TIER_META[e.template.tier];
  return (
    <div className="w-[120px] shrink-0" style={{ perspective: '450px' }}>
      <div
        className="aspect-[4/5] overflow-hidden border"
        style={{
          transform: 'rotateY(-10deg) rotateX(2deg)',
          borderColor: `${meta.color}66`,
          boxShadow: `6px 5px 14px rgba(0,0,0,.6)${isFoil(e.template.tier) ? `, 0 0 12px ${meta.color}40` : ''}`,
        }}
      >
        <TacticalBoard
          trajectory={e.template.trajectory}
          jersey={e.template.player.jersey}
          color={meta.color}
          foil={isFoil(e.template.tier)}
          hoverPlay
        />
      </div>
    </div>
  );
}

function avatarBg(user: string | null) {
  let h = 0;
  for (const c of user ?? '?') h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 75% 46%), hsl(${(h + 45) % 360} 75% 34%))`;
}

function Username({ user }: { user: string | null }) {
  if (!user) return <span className="font-bold text-white">@anônimo</span>;
  return (
    <Link href={`/u/${user}`} className="font-bold text-white hover:underline">
      @{user}
    </Link>
  );
}

function EventCard({ e }: { e: FeedEvent }) {
  const meta = e.template ? TIER_META[e.template.tier] : null;
  // pull raro (Lendário/Galáctico) ganha moldura foil na cor do tier, como no Top Shot
  const rarePull = e.kind === 'PACK_OPEN' && e.template && isFoil(e.template.tier);
  return (
    <article
      className="border border-white/10 bg-[#0c0c0e]"
      style={rarePull ? { borderColor: `${meta!.color}88`, boxShadow: `0 0 18px ${meta!.color}30` } : undefined}
    >
      {/* cabeçalho: avatar + @user + ação + tempo */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase text-white"
          style={{ background: avatarBg(e.user) }}
        >
          {(e.user ?? '?')[0]}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-neutral-300">
          <Username user={e.user} /> {ACTION[e.kind]}{' '}
          {e.kind === 'PACK_OPEN' && <span className="font-bold text-white">{e.count} Lances</span>}
          {e.kind === 'LIST' && (e.count ?? 1) > 1 && (
            <span className="font-bold text-white">{e.count} Lances</span>
          )}
          {(e.kind === 'CHALLENGE' || e.kind === 'QUEST' || e.kind === 'CHECKIN') && (
            <span className="font-bold text-white">{e.label}</span>
          )}
          {(e.kind === 'SALE' || e.kind === 'GIFT' || e.kind === 'BURN' || (e.kind === 'LIST' && (e.count ?? 1) === 1)) &&
            e.template && (
              <span className="font-bold text-white">
                {e.template.player.name} #{e.serial}
              </span>
            )}
          <span className="text-neutral-500"> · {timeAgo(e.createdAt)}</span>
        </p>
      </div>

      {/* corpo por tipo de evento */}
      {e.template ? (
        <Link
          href={e.momentId ? `/momento/${e.momentId}` : `/lance/${e.template.id}`}
          className="group flex items-center gap-4 border-t border-white/10 bg-[#08080a] px-4 py-4 transition-colors hover:bg-white/5"
        >
          <MomentThumb e={e} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px]" style={{ color: meta!.color }}>
              {meta!.label}
              {e.template.editionType === 'LIMITADA' && ` · #${e.serial}/${e.template.editionSize}`}
            </div>
            <div className="truncate font-display text-[19px] uppercase text-white">
              {e.template.player.name}
            </div>
            <div className="truncate text-[12px] text-neutral-400">{e.template.title}</div>
            {e.kind === 'LIST' && (e.count ?? 1) > 1 && (
              <div className="mt-1 text-[11px] text-neutral-500">
                e mais {(e.count ?? 1) - 1} anúncio{(e.count ?? 1) > 2 ? 's' : ''} deste vendedor
              </div>
            )}
            {e.kind === 'PACK_OPEN' &&
              (rarePull ? (
                <div
                  className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white"
                  style={{ background: `${meta!.color}33`, border: `1px solid ${meta!.color}88` }}
                >
                  Puxou um {meta!.label} 🔥
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-neutral-500">melhor carta do pacote</div>
              ))}
          </div>
          {(e.kind === 'SALE' || e.kind === 'LIST') && (
            <div className="shrink-0 text-right">
              <div
                className={`text-[10px] font-bold uppercase tracking-wide ${e.kind === 'LIST' ? 'text-accent3' : 'text-emerald-400'}`}
              >
                {e.kind === 'LIST' ? ((e.count ?? 1) > 1 ? 'a partir de' : 'pedindo') : 'vendido por'}
              </div>
              <div className="text-[20px] font-bold tabular-nums text-white">{brl(e.priceCents ?? 0)}</div>
              {e.kind === 'LIST' && (
                <div className="mt-1.5 inline-block border border-accent3/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent3 transition-colors group-hover:bg-accent3 group-hover:text-black">
                  Comprar
                </div>
              )}
            </div>
          )}
        </Link>
      ) : (
        <div className="flex items-center gap-3 border-t border-white/10 bg-[#08080a] px-4 py-4">
          <span className="text-xl" aria-hidden>
            {e.kind === 'CHECKIN' ? '📍' : '🏆'}
          </span>
          <div className="text-[13px] text-neutral-300">
            {e.kind === 'CHECKIN'
              ? 'Prova de presença no estádio — ganhou um pacote.'
              : 'Recompensa liberada.'}
          </div>
        </div>
      )}
    </article>
  );
}

function PopularPanel({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="border border-white/10 bg-[#0c0c0e] px-4 py-4">
      <div className="mb-3 text-center text-[13px] font-bold uppercase tracking-[0.2em] text-white">
        {title}
      </div>
      <div className="mb-2 text-center text-[10px] uppercase tracking-wide text-neutral-500">
        últimas 24 horas
      </div>
      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-baseline justify-between text-[13px]">
            <Link
              href={`/mercado?q=${encodeURIComponent(r.name)}`}
              className="truncate text-neutral-200 hover:text-white hover:underline"
            >
              {i + 1}. {r.name}
            </Link>
            <span className="shrink-0 tabular-nums text-[11px] text-neutral-500">{r.count} negócios</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// abas de filtro do feed (como as tabs do Explore do Top Shot)
const FEED_TABS: { key: string; label: string; kinds: FeedEvent['kind'][] | null }[] = [
  { key: '', label: 'Tudo', kinds: null },
  { key: 'vendas', label: 'Vendas', kinds: ['SALE', 'LIST', 'GIFT', 'BURN'] },
  { key: 'pacotes', label: 'Pacotes', kinds: ['PACK_OPEN'] },
  { key: 'jogo', label: 'Jogo', kinds: ['CHALLENGE', 'QUEST'] },
  { key: 'checkins', label: 'Check-ins', kinds: ['CHECKIN'] },
];

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; n?: string; d?: string }>;
}) {
  const { f, n, d } = await searchParams;
  const compact = d === '1';
  const tab = FEED_TABS.find((t) => t.key === (f ?? '')) ?? FEED_TABS[0];
  // paginação simples: ?n= aumenta a janela do feed (teto 120 no backend)
  const size = Math.min(120, Math.max(40, Number(n) || 40));
  const fetchSize = tab.kinds ? Math.min(120, size + 40) : size;
  const [feed, me, wishlist, checklists] = await Promise.all([
    getFeedServer(fetchSize),
    getMe(),
    getWishlistServer().catch(() => null),
    getChecklistsServer().catch(() => []),
  ]);
  const events = (feed?.events ?? []).filter((e) => !tab.kinds || tab.kinds.includes(e.kind));
  const nearDone = checklists
    .filter((c) => c.progress && !c.claimed && c.progress.have > 0)
    .sort((a, b) => a.progress!.need - a.progress!.have - (b.progress!.need - b.progress!.have))
    .slice(0, 3);

  return (
    <main className="w-full px-4 py-8 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* rail pessoal (como o do Explore do Top Shot) */}
        <aside className="space-y-5 lg:sticky lg:top-[88px] lg:self-start">
          {me && (
            <section className="border border-white/10 bg-[#0c0c0e] p-4">
              <div className="mb-3 text-[13px] font-bold text-white">Seus números</div>
              <div className="space-y-2 text-[12px]">
                {[
                  { label: 'Saldo', v: brl(me.balanceCents), href: '/perfil' },
                  { label: 'Pontuação wefans', v: me.topShotScore.toLocaleString('pt-BR'), href: '/perfil' },
                  { label: 'Fichas de Troca', v: String(me.tradeTickets), href: '/fichas' },
                ].map((r) => (
                  <Link key={r.label} href={r.href} className="flex items-baseline justify-between hover:text-white">
                    <span className="text-neutral-400">{r.label}</span>
                    <span className="font-semibold tabular-nums text-accent3">{r.v}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="border border-white/10 bg-[#0c0c0e] p-4">
            <div className="mb-3 text-[13px] font-bold text-white">Perto de completar</div>
            {!me ? (
              <p className="text-[12px] text-neutral-400">
                <Link href="/entrar" className="text-white underline">
                  Entre
                </Link>{' '}
                para acompanhar seus checklists e wishlist.
              </p>
            ) : nearDone.length === 0 ? (
              <p className="text-[12px] text-neutral-400">
                Colecione Lances para avançar nos{' '}
                <Link href="/jogar/checklists" className="text-white underline">
                  checklists
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-3">
                {nearDone.map((c) => (
                  <Link key={c.id} href="/jogar/checklists" className="block">
                    <div className="mb-1 flex items-baseline justify-between text-[12px]">
                      <span className="truncate font-semibold text-neutral-200">{c.name}</span>
                      <span className="shrink-0 tabular-nums text-[10px] text-neutral-500">
                        {c.progress!.have}/{c.progress!.need}
                      </span>
                    </div>
                    <div className="h-1 bg-white/10">
                      <div
                        className="h-1 bg-accent3"
                        style={{ width: `${(c.progress!.have / c.progress!.need) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="border border-white/10 bg-[#0c0c0e] p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[13px] font-bold text-white">Minha Wishlist</span>
              {me && (
                <Link href="/perfil" className="text-[11px] text-neutral-400 hover:text-white">
                  ver todas
                </Link>
              )}
            </div>
            {!me || !wishlist ? (
              <p className="text-[12px] text-neutral-400">Marque edições com o marcador nos cards.</p>
            ) : wishlist.length === 0 ? (
              <p className="text-[12px] text-neutral-400">
                Sua lista está vazia — explore o{' '}
                <Link href="/mercado" className="text-white underline">
                  mercado
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2.5">
                {wishlist.slice(0, 4).map((t) => (
                  <Link key={t.id} href={`/lance/${t.id}`} className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-neutral-200">
                        {t.player.name}
                      </span>
                      <span className="block truncate text-[10px] text-neutral-500">{t.title}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[11px] text-accent3">
                      {t.aspCents > 0 ? brl(t.aspCents) : '—'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>

        {/* feed central */}
        <div className="min-w-0 space-y-3">
          <div className="sticky top-[72px] z-20 -mx-1 bg-[#050505] px-1 pt-1">
            <SubTabs
              items={FEED_TABS.map((t) => ({
                label: t.label,
                href: t.key ? `/explorar?f=${t.key}` : '/explorar',
                active: t.key === tab.key,
              }))}
            />
            <FeedPoller latestId={feed?.events[0]?.id ?? null} />
            <div className="flex justify-end pb-1">
              <Link
                href={`/explorar?${new URLSearchParams({ ...(f ? { f } : {}), ...(compact ? {} : { d: '1' }) })}`}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500 hover:text-white"
              >
                {compact ? 'modo cards' : 'modo compacto'}
              </Link>
            </div>
          </div>
          {events.length === 0 && (
            <EmptyState
              title="Sem atividade ainda"
              hint="Abra um pacote ou compre no mercado — cada jogada vira um evento aqui."
              cta={{ label: 'Abrir um pacote', href: '/pacotes' }}
            />
          )}
          {events.map((e) =>
            compact ? (
              <Link
                key={e.id}
                href={e.momentId ? `/momento/${e.momentId}` : e.template ? `/lance/${e.template.id}` : '/explorar'}
                className="flex items-center gap-2.5 border border-white/[0.06] bg-[#0c0c0e] px-3 py-2 text-[12px] transition-colors hover:border-white/25"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold uppercase text-white"
                  style={{ background: avatarBg(e.user) }}
                >
                  {(e.user ?? '?')[0]}
                </span>
                <span className="min-w-0 flex-1 truncate text-neutral-300">
                  <span className="font-bold text-white">@{e.user ?? 'anônimo'}</span> {ACTION[e.kind]}{' '}
                  <span className="font-semibold text-white">
                    {e.template ? `${e.template.player.name}${e.serial ? ` #${e.serial}` : ''}` : (e.label ?? '')}
                  </span>
                </span>
                {e.priceCents != null && e.priceCents > 0 && (
                  <span className="shrink-0 font-bold tabular-nums text-white">{brl(e.priceCents)}</span>
                )}
                <span className="shrink-0 text-[10px] text-neutral-500">{timeAgo(e.createdAt)}</span>
              </Link>
            ) : (
              <EventCard key={e.id} e={e} />
            ),
          )}
          {(feed?.events.length ?? 0) >= fetchSize && size < 120 && (
            <Link
              href={`/explorar?${new URLSearchParams({ ...(f ? { f } : {}), n: String(size + 40) })}`}
              scroll={false}
              className="block border border-white/15 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Carregar mais
            </Link>
          )}
        </div>

        {/* rail direito: populares 24h + banner (como o Explore do Top Shot) */}
        <aside className="hidden space-y-5 lg:sticky lg:top-[88px] lg:block lg:self-start">
          <PopularPanel title="Jogadores mais populares" rows={feed?.popular.players ?? []} />
          <Link
            href="/jogar/desafios"
            className="block bg-sunset px-5 py-5 text-center transition-opacity hover:opacity-90"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
              Complete o álbum
            </div>
            <div className="mt-1 font-display text-[19px] uppercase leading-tight text-white">
              Feche um desafio e leve um pack exclusivo
            </div>
          </Link>
          <PopularPanel title="Coleções mais populares" rows={feed?.popular.competitions ?? []} />
        </aside>
      </div>
    </main>
  );
}
