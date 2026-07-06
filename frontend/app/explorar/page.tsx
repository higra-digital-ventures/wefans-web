import Icon from '@/components/Icon';
import Link from 'next/link';
import { getCollectionServer, getFeedServer, getWishlistServer, getChecklistsServer, getMe } from '@/lib/api-server';
import SubTabs from '@/components/SubTabs';
import EmptyState from '@/components/EmptyState';
import FeedPoller from '@/components/FeedPoller';
import ReactionButton from '@/components/ReactionButton';
import TacticalBoard from '@/components/TacticalBoard';
import UserHoverCard from '@/components/UserHoverCard';
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

// separadores de dia do stream (mesma régua das notificações)
function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startToday) return 'Hoje';
  if (d.getTime() >= startToday - 86_400_000) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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

// thumb reto no stream: o feed é sobre o fato, a carta 3D fica para as grades
// e para a página do Momento (o lance ainda toca no hover)
function MomentThumb({ e }: { e: FeedEvent }) {
  if (!e.template) return null;
  const meta = TIER_META[e.template.tier];
  return (
    <div className="w-[96px] shrink-0">
      <div
        className="aspect-[4/5] overflow-hidden border"
        style={{
          borderColor: `${meta.color}55`,
          boxShadow: isFoil(e.template.tier) ? `0 0 12px ${meta.color}33` : undefined,
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

function Username({ user, me }: { user: string | null; me?: string | null }) {
  if (!user) return <span className="font-bold text-white">@anônimo</span>;
  if (me && user === me) return <span className="font-bold text-accent3">você</span>;
  return (
    <UserHoverCard username={user}>
      <Link href={`/u/${user}`} className="font-bold text-white hover:underline">
        @{user}
      </Link>
    </UserHoverCard>
  );
}

// a micro-história do preço: barganha (abaixo da média) ou ousadia (acima)
function PriceStory({ priceCents, aspCents }: { priceCents?: number; aspCents?: number }) {
  if (!priceCents || !aspCents || aspCents <= 0) return null;
  const pct = Math.round(((priceCents - aspCents) / aspCents) * 100);
  if (Math.abs(pct) < 5) return null;
  return (
    <div
      title={`Preço médio das últimas vendas: ${brl(aspCents)}`}
      className={`mt-0.5 text-[10px] font-semibold tabular-nums ${pct < 0 ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {pct > 0 ? '+' : ''}
      {pct}% vs média
    </div>
  );
}

function EventCard({
  e,
  me,
  reaction,
}: {
  e: FeedEvent;
  me?: string | null;
  reaction?: { count: number; mine: boolean; authed: boolean };
}) {
  const meta = e.template ? TIER_META[e.template.tier] : null;
  // pull raro (Lendário/Galáctico) ganha moldura foil na cor do tier, como no Top Shot
  const rarePull = e.kind === 'PACK_OPEN' && e.template && isFoil(e.template.tier);
  // evento seu: borda de acento — ver a si mesmo no feed
  const mine = !!me && (e.user === me || e.targetUser === me);
  // eventos-marco: recorde da semana e serial #1 (dourado)
  const serialOne = e.serial === 1 && !!e.template && (e.kind === 'PACK_OPEN' || e.kind === 'SALE' || e.kind === 'LIST');
  const milestone = e.record || serialOne;
  // linhas, não cards (padrão X): o comum é plano com hairline; moldura só
  // para o que merece moldura — marco, pull foil ou evento seu
  const boxed = milestone || rarePull || mine;

  // eventos leves (desafio/missão/check-in): uma linha só — o olho acelera
  // no rotineiro e freia no que tem mídia e dinheiro
  if (!e.template && !boxed) {
    return (
      <article className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-2.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
          style={{ background: avatarBg(e.user) }}
        >
          {(e.user ?? '?')[0]}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-neutral-400">
          <Username user={e.user} me={me} /> {ACTION[e.kind]}{' '}
          <span className="font-semibold text-neutral-200">{e.label}</span>
        </p>
        {reaction && (
          <ReactionButton
            eventKey={e.id}
            count={reaction.count}
            reacted={reaction.mine}
            authed={reaction.authed}
          />
        )}
        <span className="shrink-0 text-[11px] text-neutral-500">{timeAgo(e.createdAt)}</span>
      </article>
    );
  }

  return (
    <article
      className={
        boxed
          ? `my-2.5 border bg-[#0c0c0e] ${milestone ? 'border-amber-400/60' : mine ? 'border-accent3/50' : 'border-white/10'}`
          : 'border-b border-white/[0.06]'
      }
      style={
        milestone
          ? { boxShadow: '0 0 18px rgba(251,191,36,.18)' }
          : rarePull
            ? { borderColor: `${meta!.color}88`, boxShadow: `0 0 18px ${meta!.color}30` }
            : undefined
      }
    >
      {milestone && (
        <div className="flex items-center gap-1.5 border-b border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
          <Icon name="trophy" size={12} />
          {e.record ? 'Maior venda da semana' : 'Serial #1 — o primeiro exemplar'}
        </div>
      )}
      {/* cabeçalho: avatar + @user + ação + tempo */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase text-white"
          style={{ background: avatarBg(e.user) }}
        >
          {(e.user ?? '?')[0]}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-neutral-300">
          <Username user={e.user} me={me} /> {ACTION[e.kind]}{' '}
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
        </p>
        <span className="ml-auto shrink-0 text-[11px] text-neutral-500" title={new Date(e.createdAt).toLocaleString('pt-BR')}>
          {timeAgo(e.createdAt)}
        </span>
      </div>

      {/* corpo por tipo de evento */}
      {e.template ? (
        <Link
          href={e.momentId ? `/momento/${e.momentId}` : `/lance/${e.template.id}`}
          className={`group flex items-center gap-4 px-4 py-4 transition-colors ${
            boxed ? 'border-t border-white/10 bg-[#08080a] hover:bg-white/5' : 'hover:bg-white/[0.03]'
          }`}
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
                  Puxou um {meta!.label} <Icon name="flame" filled size={14} className="inline align-[-2px]" />
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-neutral-500">melhor carta do pacote</div>
              ))}
          </div>
          {(e.kind === 'SALE' || e.kind === 'LIST') && (
            <div className="shrink-0 text-right">
              <div
                className={`text-[10px] font-bold uppercase tracking-wide ${e.kind === 'LIST' ? 'text-neutral-400' : 'text-emerald-400'}`}
              >
                {e.kind === 'LIST' ? ((e.count ?? 1) > 1 ? 'a partir de' : 'pedindo') : 'vendido por'}
              </div>
              <div className="text-[20px] font-bold tabular-nums text-white">{brl(e.priceCents ?? 0)}</div>
              <PriceStory priceCents={e.priceCents} aspCents={e.template?.aspCents} />
              {e.kind === 'LIST' && (
                <div className="mt-1.5 inline-block border border-white/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white transition-colors group-hover:bg-white group-hover:text-black">
                  Comprar
                </div>
              )}
            </div>
          )}
        </Link>
      ) : (
        <div
          className={`flex items-center gap-3 px-4 py-4 ${boxed ? 'border-t border-white/10 bg-[#08080a]' : ''}`}
        >
          <span className="text-xl" aria-hidden>
            {e.kind === 'CHECKIN' ? <Icon name="checkin" size={14} /> : <Icon name="trophy" size={14} />}
          </span>
          <div className="text-[13px] text-neutral-300">
            {e.kind === 'CHECKIN'
              ? 'Prova de presença no estádio — ganhou um pacote.'
              : 'Recompensa liberada.'}
          </div>
        </div>
      )}

      {/* fileira de ações (padrão X): 🔥 · Proposta · ver Lance */}
      <div
        className={`flex items-center gap-5 px-4 py-2 ${boxed ? 'border-t border-white/[0.06]' : ''}`}
      >
        {reaction && (
          <ReactionButton
            eventKey={e.id}
            count={reaction.count}
            reacted={reaction.mine}
            authed={reaction.authed}
          />
        )}
        {e.kind === 'LIST' && e.user && e.user !== me && e.template && (
          <Link
            href={`/chat?u=${encodeURIComponent(e.user)}&draft=${encodeURIComponent(
              `Oi! Vi seu anúncio do ${e.template.player.name} #${e.serial} por ${brl(e.priceCents ?? 0)} no feed — bora negociar?`,
            )}`}
            title="Fazer proposta no chat"
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500 transition-colors hover:text-white"
          >
            <Icon name="chat" size={13} />
            Proposta
          </Link>
        )}
        {e.template && (
          <Link
            href={e.momentId ? `/momento/${e.momentId}` : `/lance/${e.template.id}`}
            className="ml-auto text-[11px] font-semibold text-neutral-500 transition-colors hover:text-white"
          >
            ver Lance →
          </Link>
        )}
      </div>
    </article>
  );
}

// carrossel "Em alta": edições mais negociadas nas últimas 24h — o que está
// pegando fogo no mercado, antes mesmo de rolar o feed
function TrendingStrip({
  items,
}: {
  items: { template: import('@/lib/types').TemplateDTO; count: number; dir?: 'up' | 'down' | null }[];
}) {
  if (items.length < 2) return null;
  return (
    <section className="border border-white/10 bg-[#0c0c0e] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
        <Icon name="flame" filled size={14} />
        Em alta · 24h
      </div>
      <div className="scrollbar-none -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {items.map(({ template: t, count, dir }, i) => {
          const meta = TIER_META[t.tier];
          return (
            <Link
              key={t.id}
              href={`/lance/${t.id}`}
              className="relative w-[118px] shrink-0 border border-white/10 bg-[#08080a] p-2 transition-colors hover:border-white/30"
            >
              {/* posição no ranking — mini-tabela de cotação, não só vitrine */}
              <span className="absolute left-0 top-0 z-10 bg-white px-1.5 py-0.5 tabular-nums text-[10px] font-bold text-black">
                {i + 1}
              </span>
              <div className="mx-auto w-[86%]">
                <div className="aspect-[4/5] overflow-hidden border" style={{ borderColor: `${meta.color}66` }}>
                  <TacticalBoard
                    trajectory={t.trajectory}
                    jersey={t.player.jersey}
                    color={meta.color}
                    foil={isFoil(t.tier)}
                  />
                </div>
              </div>
              <div className="mt-1.5 truncate text-[11px] font-bold text-white">{t.player.name}</div>
              <div className="flex items-baseline justify-between text-[10px]">
                <span
                  className={`tabular-nums font-semibold ${
                    dir === 'up' ? 'text-emerald-400' : dir === 'down' ? 'text-red-400' : 'text-neutral-500'
                  }`}
                  title={
                    dir === 'up'
                      ? 'mais negócios que nas 24h anteriores'
                      : dir === 'down'
                        ? 'menos negócios que nas 24h anteriores'
                        : `${count} negócios em 24h`
                  }
                >
                  {dir === 'up' ? '↑ ' : dir === 'down' ? '↓ ' : ''}
                  {count} neg.
                </span>
                <span className="tabular-nums font-semibold text-neutral-200">
                  {t.aspCents > 0 ? brl(t.aspCents) : ''}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
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
  const me0 = await getMe();
  // "Para você" só existe logado (padrão X: For you | Following)
  const tabs = me0
    ? [{ key: 'voce', label: 'Para você', kinds: null as FeedEvent['kind'][] | null }, ...FEED_TABS]
    : FEED_TABS;
  // 'tudo' força a aba geral mesmo logado (o default logado é 'voce')
  const fKey = f === 'tudo' ? '' : f;
  const tab = tabs.find((t) => t.key === (fKey ?? (me0 ? 'voce' : ''))) ?? tabs[0];
  const forYou = tab.key === 'voce';
  // paginação simples: ?n= aumenta a janela do feed (teto 120 no backend)
  const size = Math.min(120, Math.max(40, Number(n) || 40));
  const fetchSize = forYou || tab.kinds ? Math.min(120, size + 40) : size;
  const [feed, wishlist, checklists, collection] = await Promise.all([
    getFeedServer(fetchSize),
    getWishlistServer().catch(() => null),
    getChecklistsServer().catch(() => []),
    me0 ? getCollectionServer('').catch(() => null) : null,
  ]);
  const me = me0;

  // relevância: seus eventos, edições da wishlist, edições/jogadores que você coleciona
  const wishIds = new Set((wishlist ?? []).map((t) => t.id));
  const ownedTemplates = new Set((collection ?? []).map((m) => m.template.id));
  const ownedPlayers = new Set((collection ?? []).map((m) => m.template.player.name));
  const isRelevant = (e: FeedEvent) =>
    !!me &&
    (e.user === me.username ||
      e.targetUser === me.username ||
      (!!e.template &&
        (wishIds.has(e.template.id) ||
          ownedTemplates.has(e.template.id) ||
          ownedPlayers.has(e.template.player.name))));

  let events = (feed?.events ?? []).filter((e) => !tab.kinds || tab.kinds.includes(e.kind));
  if (forYou) events = events.filter(isRelevant);

  // recap pessoal: o que aconteceu com as SUAS coisas nas últimas 24h (eventos de terceiros)
  const dayAgo = Date.now() - 86_400_000;
  const recent = (feed?.events ?? []).filter(
    (e) => new Date(e.createdAt).getTime() >= dayAgo && e.user !== me?.username,
  );
  const recapWishListed = recent.filter(
    (e) => e.kind === 'LIST' && e.template && wishIds.has(e.template.id),
  ).length;
  const recapWishSold = recent.filter(
    (e) => e.kind === 'SALE' && e.template && wishIds.has(e.template.id),
  ).length;
  const recapPlayerMoves = recent.filter(
    (e) =>
      (e.kind === 'SALE' || e.kind === 'LIST') &&
      e.template &&
      !wishIds.has(e.template.id) &&
      ownedPlayers.has(e.template.player.name),
  ).length;
  const recapTotal = recapWishListed + recapWishSold + recapPlayerMoves;
  const nearDone = checklists
    .filter((c) => c.progress && !c.claimed && c.progress.have > 0)
    .sort((a, b) => a.progress!.need - a.progress!.have - (b.progress!.need - b.progress!.have))
    .slice(0, 3);

  return (
    // Feed centralizado (padrão X): leitura vertical pede coluna limitada —
    // fullscreen fica para as grades (mercado/coleção) e apps (chat).
    <main className="mx-auto w-full max-w-[1360px] px-4 py-8 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,680px)_300px] lg:justify-center">
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
            <div className="flex items-start justify-between gap-3">
              <SubTabs
                items={tabs.map((t) => ({
                  label: t.label,
                  href: t.key ? `/explorar?f=${t.key}` : me ? '/explorar?f=tudo' : '/explorar',
                  active: t.key === tab.key,
                }))}
              />
              <Link
                href={`/explorar?${new URLSearchParams({ ...(f ? { f } : {}), ...(compact ? {} : { d: '1' }) })}`}
                scroll={false}
                aria-label={compact ? 'Modo cards' : 'Modo compacto'}
                title={compact ? 'Modo cards' : 'Modo compacto'}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-white/15 text-neutral-400 transition-colors hover:border-white/40 hover:text-white"
              >
                <Icon name={compact ? 'grid' : 'list'} size={14} />
              </Link>
            </div>
            <FeedPoller latestId={feed?.events[0]?.id ?? null} />
          </div>
          {!compact && <TrendingStrip items={feed?.popular.trending ?? []} />}
          {me && recapTotal > 0 && !compact && (
            <section className="border border-accent3/25 bg-accent3/[0.04] px-4 py-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent3">
                Enquanto você esteve fora · 24h
              </div>
              <ul className="space-y-0.5 text-[13px] text-neutral-300">
                {recapWishListed > 0 && (
                  <li>
                    <span className="font-bold text-white">{recapWishListed}</span> ediç
                    {recapWishListed > 1 ? 'ões' : 'ão'} da sua wishlist{' '}
                    {recapWishListed > 1 ? 'foram listadas' : 'foi listada'} à venda
                  </li>
                )}
                {recapWishSold > 0 && (
                  <li>
                    <span className="font-bold text-white">{recapWishSold}</span> venda
                    {recapWishSold > 1 ? 's' : ''} de edições da sua wishlist
                  </li>
                )}
                {recapPlayerMoves > 0 && (
                  <li>
                    <span className="font-bold text-white">{recapPlayerMoves}</span> negócio
                    {recapPlayerMoves > 1 ? 's' : ''} com jogadores que você coleciona
                  </li>
                )}
              </ul>
              {!forYou && (
                <Link
                  href="/explorar?f=voce"
                  className="mt-1.5 inline-block text-[11px] font-bold uppercase tracking-wide text-accent3 hover:text-white"
                >
                  ver no seu feed →
                </Link>
              )}
            </section>
          )}
          {events.length === 0 &&
            (forYou ? (
              <EmptyState
                title="Seu feed ainda está em aquecimento"
                hint="Marque edições na wishlist e colecione jogadores — tudo que acontecer com eles aparece aqui."
                cta={{ label: 'Explorar o mercado', href: '/mercado' }}
              />
            ) : (
              <EmptyState
                title="Sem atividade ainda"
                hint="Abra um pacote ou compre no mercado — cada jogada vira um evento aqui."
                cta={{ label: 'Abrir um pacote', href: '/pacotes' }}
              />
            ))}
          {/* stream contínuo: linhas coladas (hairline), caixas destacadas com respiro próprio */}
          <div className={compact ? 'space-y-2' : 'border-t border-white/[0.06]'}>
          {events.map((e, i) => {
            const label = dayLabel(e.createdAt);
            const showDay = i === 0 || dayLabel(events[i - 1].createdAt) !== label;
            const row = compact ? (
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
              <EventCard
                key={e.id}
                e={e}
                me={me?.username ?? null}
                reaction={{
                  count: feed?.reactions?.counts[e.id] ?? 0,
                  mine: feed?.reactions?.mine.includes(e.id) ?? false,
                  authed: !!me,
                }}
              />
            );
            return (
              <div
                key={e.id}
                className={i < 6 ? 'wf-feed-in' : undefined}
                style={i < 6 ? { animationDelay: `${i * 60}ms` } : undefined}
              >
                {showDay && (
                  <div className="flex items-center gap-3 py-2" aria-label={label}>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                      {label}
                    </span>
                    <span className="h-px flex-1 bg-white/[0.06]" aria-hidden />
                  </div>
                )}
                {row}
              </div>
            );
          })}
          </div>
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
