import type { PrismaClient } from '@prisma/client';
import { toTemplateDTO } from '../lib/dto';

/**
 * Feed social do Explorar (gramática do "Explore" do Top Shot): agrega eventos que
 * a economia já registra — vendas, aberturas de pacote, presentes, queimas, desafios,
 * missões e check-ins — num stream único. Só leitura; nenhum modelo novo.
 */

type FeedEvent = {
  id: string;
  kind: 'SALE' | 'LIST' | 'PACK_OPEN' | 'GIFT' | 'BURN' | 'CHALLENGE' | 'QUEST' | 'CHECKIN';
  user: string | null;
  targetUser?: string | null;
  createdAt: string;
  priceCents?: number;
  count?: number;
  momentId?: string;
  serial?: number;
  template?: ReturnType<typeof toTemplateDTO>;
  label?: string; // nome do desafio/missão ou "Time A x Time B (Estádio)"
};

const TIER_RANK: Record<string, number> = {
  GALACTICO: 5,
  LENDARIO: 4,
  RARO: 3,
  TORCIDA: 2,
  COMUM: 1,
};

// O feed é público e idêntico para todos: cache in-memory curto corta o custo
// das agregações sem perder a sensação de tempo real (polling do front é de 15s).
const FEED_TTL_MS = 12_000;
const POPULAR_TTL_MS = 60_000;
let feedCache: { take: number; ts: number; data: FeedEvent[] } | null = null;
let popularCache: { ts: number; data: Awaited<ReturnType<typeof computePopular>> } | null = null;

export async function getFeed(db: PrismaClient, limit = 30) {
  const take = Math.min(limit, 60);
  if (feedCache && feedCache.take >= take && Date.now() - feedCache.ts < FEED_TTL_MS) {
    return feedCache.data.slice(0, take);
  }
  const momentInclude = {
    moment: { include: { template: { include: { player: true } } } },
    buyer: { select: { username: true } },
    seller: { select: { username: true } },
  } as const;

  const [trades, listings, mints, entries, claims, checkins] = await Promise.all([
    db.transaction.findMany({
      where: { type: { in: ['BUY', 'OFFER_ACCEPT', 'GIFT', 'BURN'] } },
      include: momentInclude,
      orderBy: { createdAt: 'desc' },
      take,
    }),
    db.listing.findMany({
      where: { status: 'ACTIVE' },
      include: {
        moment: { include: { template: { include: { player: true } } } },
        seller: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    db.transaction.findMany({
      where: { type: 'MINT' },
      include: momentInclude,
      orderBy: { createdAt: 'desc' },
      take: take * 3, // mints vêm em lotes de ~3 por pacote
    }),
    db.challengeEntry.findMany({
      where: { completedAt: { not: null } },
      include: { challenge: { select: { name: true } }, user: { select: { username: true } } },
      orderBy: { completedAt: 'desc' },
      take,
    }),
    db.questClaim.findMany({ orderBy: { claimedAt: 'desc' }, take }),
    db.checkIn.findMany({
      where: { status: 'VALID' },
      include: {
        user: { select: { username: true } },
        fixture: { include: { homeTeam: true, awayTeam: true, stadium: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
  ]);

  const events: FeedEvent[] = [];

  for (const t of trades) {
    events.push({
      id: t.id,
      kind: t.type === 'BUY' || t.type === 'OFFER_ACCEPT' ? 'SALE' : (t.type as 'GIFT' | 'BURN'),
      user: t.buyer?.username ?? t.seller?.username ?? null,
      targetUser: t.type === 'GIFT' ? t.buyer?.username : undefined,
      createdAt: t.createdAt.toISOString(),
      priceCents: t.amountCents,
      momentId: t.momentId,
      serial: t.moment.serial,
      template: toTemplateDTO(t.moment.template),
    });
  }

  for (const l of listings) {
    events.push({
      id: `l-${l.id}`,
      kind: 'LIST',
      user: l.seller.username,
      createdAt: l.createdAt.toISOString(),
      priceCents: l.priceCents,
      momentId: l.momentId,
      serial: l.moment.serial,
      template: toTemplateDTO(l.moment.template),
    });
  }

  // agrupa MINTs do mesmo usuário em janelas de 90s = uma abertura de pacote;
  // a arte do evento é o Lance de tier mais alto do lote
  const packGroups = new Map<string, typeof mints>();
  for (const m of mints) {
    const bucket = Math.floor(m.createdAt.getTime() / 90_000);
    const key = `${m.buyerId}-${bucket}`;
    const g = packGroups.get(key);
    if (g) g.push(m);
    else packGroups.set(key, [m]);
  }
  for (const group of packGroups.values()) {
    const best = [...group].sort(
      (a, b) => (TIER_RANK[b.moment.template.tier] ?? 0) - (TIER_RANK[a.moment.template.tier] ?? 0),
    )[0];
    events.push({
      id: `pack-${best.id}`,
      kind: 'PACK_OPEN',
      user: best.buyer?.username ?? null,
      createdAt: best.createdAt.toISOString(),
      count: group.length,
      momentId: best.momentId,
      serial: best.moment.serial,
      template: toTemplateDTO(best.moment.template),
    });
  }

  for (const e of entries) {
    events.push({
      id: `ch-${e.id}`,
      kind: 'CHALLENGE',
      user: e.user.username,
      createdAt: e.completedAt!.toISOString(),
      label: e.challenge.name,
    });
  }

  if (claims.length > 0) {
    const [quests, users] = await Promise.all([
      db.quest.findMany({ where: { id: { in: claims.map((c) => c.questId) } } }),
      db.user.findMany({
        where: { id: { in: claims.map((c) => c.userId) } },
        select: { id: true, username: true },
      }),
    ]);
    const questName = new Map(quests.map((q) => [q.id, q.name]));
    const username = new Map(users.map((u) => [u.id, u.username]));
    for (const c of claims) {
      events.push({
        id: `q-${c.id}`,
        kind: 'QUEST',
        user: username.get(c.userId) ?? null,
        createdAt: c.claimedAt.toISOString(),
        label: questName.get(c.questId) ?? 'Missão',
      });
    }
  }

  for (const c of checkins) {
    events.push({
      id: `ci-${c.id}`,
      kind: 'CHECKIN',
      user: c.user.username,
      createdAt: c.createdAt.toISOString(),
      label: `${c.fixture.homeTeam.name} x ${c.fixture.awayTeam.name} (${c.fixture.stadium.name})`,
    });
  }

  // privacidade: quem desligou "aparecer no feed" sai do stream público
  const hidden = await db.user.findMany({ where: { showInFeed: false }, select: { username: true } });
  const hiddenSet = new Set(hidden.map((u) => u.username));
  const visible = events.filter(
    (e) => !(e.user && hiddenSet.has(e.user)) && !(e.targetUser && hiddenSet.has(e.targetUser)),
  );

  visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const data = visible.slice(0, take);
  feedCache = { take, ts: Date.now(), data };
  return data;
}

/** "Mais populares (24h)": jogadores e coleções com mais negócios no período. */
export async function getFeedPopular(db: PrismaClient) {
  if (popularCache && Date.now() - popularCache.ts < POPULAR_TTL_MS) return popularCache.data;
  const data = await computePopular(db);
  popularCache = { ts: Date.now(), data };
  return data;
}

async function computePopular(db: PrismaClient) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const txs = await db.transaction.findMany({
    where: { createdAt: { gte: since }, type: { in: ['BUY', 'OFFER_ACCEPT', 'MINT'] } },
    include: { moment: { include: { template: { include: { player: true } } } } },
    take: 500,
  });

  const byPlayer = new Map<string, number>();
  const byCompetition = new Map<string, number>();
  for (const t of txs) {
    const p = t.moment.template.player.name;
    byPlayer.set(p, (byPlayer.get(p) ?? 0) + 1);
    const c = t.moment.template.competition;
    byCompetition.set(c, (byCompetition.get(c) ?? 0) + 1);
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

  return { players: top(byPlayer), competitions: top(byCompetition) };
}
