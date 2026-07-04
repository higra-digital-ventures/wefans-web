import Link from 'next/link';
import { getFeedServer, getWishlistServer, getChecklistsServer, getMe } from '@/lib/api-server';
import SubTabs from '@/components/SubTabs';
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
    <div className="w-[92px] shrink-0" style={{ perspective: '400px' }}>
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
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunset text-[11px] font-bold uppercase text-white">
          {(e.user ?? '?')[0]}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-neutral-300">
          <Username user={e.user} /> {ACTION[e.kind]}{' '}
          {e.kind === 'PACK_OPEN' && <span className="font-bold text-white">{e.count} Lances</span>}
          {(e.kind === 'CHALLENGE' || e.kind === 'QUEST' || e.kind === 'CHECKIN') && (
            <span className="font-bold text-white">{e.label}</span>
          )}
          {(e.kind === 'SALE' || e.kind === 'LIST' || e.kind === 'GIFT' || e.kind === 'BURN') && e.template && (
            <span className="font-bold text-white">
              {e.template.player.name} #{e.serial}
            </span>
          )}
        </p>
        <span className="shrink-0 text-[11px] text-neutral-500">{timeAgo(e.createdAt)}</span>
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
              <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                {e.kind === 'LIST' ? 'pedindo' : 'por'}
              </div>
              <div className="text-[20px] font-bold text-white">{brl(e.priceCents ?? 0)}</div>
              {e.kind === 'LIST' && (
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-accent3">
                  comprar →
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
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const tab = FEED_TABS.find((t) => t.key === (f ?? '')) ?? FEED_TABS[0];
  const [feed, me, wishlist, checklists] = await Promise.all([
    getFeedServer(tab.kinds ? 60 : 40),
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
      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* rail pessoal (como o do Explore do Top Shot) */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
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
          <SubTabs
            items={FEED_TABS.map((t) => ({
              label: t.label,
              href: t.key ? `/explorar?f=${t.key}` : '/explorar',
              active: t.key === tab.key,
            }))}
          />
          <FeedPoller latestId={feed?.events[0]?.id ?? null} />
          {events.length === 0 && (
            <p className="border border-white/10 bg-[#0c0c0e] p-8 text-center text-sm text-neutral-400">
              Sem atividade ainda — abra um pacote ou compre no mercado.
            </p>
          )}
          {events.map((e, i) => (
            <div key={e.id} className="space-y-3">
              <EventCard e={e} />
              {i === 4 && <PopularPanel title="Jogadores mais populares" rows={feed?.popular.players ?? []} />}
              {i === 9 && (
                <Link
                  href="/jogar/desafios"
                  className="block bg-sunset px-5 py-4 text-center transition-opacity hover:opacity-90"
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
                    Colecione e ganhe
                  </div>
                  <div className="font-display text-[20px] uppercase text-white">
                    Complete um desafio e ganhe um pacote exclusivo
                  </div>
                </Link>
              )}
              {i === 14 && (
                <PopularPanel title="Coleções mais populares" rows={feed?.popular.competitions ?? []} />
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
