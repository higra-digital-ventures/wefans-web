import { Prisma, type PrismaClient, Tier, EditionType } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { recomputeUserScores } from '../lib/scores';
import { withDbRetry } from '../lib/tx';

// Zona administrativa (seção 10): parceria por time, ciclo de publicação, métricas,
// mint de cortesia. Toda ação relevante grava AuditLog (quem fez o quê e quando).

export async function audit(db: PrismaClient, userId: string, action: string, target?: string, meta?: unknown) {
  await db.auditLog.create({ data: { userId, action, target: target ?? null, meta: (meta as Prisma.InputJsonValue) ?? Prisma.JsonNull } });
}

// ------------------------------------------------------------------ métricas

export async function getMetrics(db: PrismaClient) {
  const [users, moments, burned, listings, sales, fees, checkinsByStatus, reviewPending, templatesByStatus, flaggedTx] =
    await Promise.all([
      db.user.count(),
      db.moment.count(),
      db.moment.count({ where: { burned: true } }),
      db.listing.count({ where: { status: 'ACTIVE' } }),
      db.transaction.aggregate({ _count: true, _sum: { amountCents: true }, where: { type: { in: ['BUY', 'OFFER_ACCEPT'] } } }),
      db.transaction.aggregate({ _sum: { feeCents: true } }),
      db.checkIn.groupBy({ by: ['status'], _count: true }),
      db.checkIn.count({ where: { status: 'REVIEW' } }),
      db.template.groupBy({ by: ['status'], _count: true }),
      db.transaction.count({ where: { flagged: true } }),
    ]);
  return {
    users,
    moments: { total: moments, burned },
    market: {
      activeListings: listings,
      sales: sales._count,
      volumeCents: sales._sum.amountCents ?? 0,
      feesCents: fees._sum.feeCents ?? 0,
      flaggedTx,
    },
    checkins: Object.fromEntries(checkinsByStatus.map((c) => [c.status, c._count])),
    reviewPending,
    templates: Object.fromEntries(templatesByStatus.map((t) => [t.status, t._count])),
  };
}

// ------------------------------------------------------------------ parcerias (times)

export async function listTeamsAdmin(db: PrismaClient) {
  const teams = await db.team.findMany({ include: { homeStadium: true, _count: { select: { templates: true } } }, orderBy: { name: 'asc' } });
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    partnerStatus: t.partnerStatus,
    status: t.status,
    publishAt: t.publishAt?.toISOString() ?? null,
    stadium: t.homeStadium ? { id: t.homeStadium.id, name: t.homeStadium.name, city: t.homeStadium.city } : null,
    templateCount: t._count.templates,
  }));
}

export async function createTeamWithStadium(
  db: PrismaClient,
  input: { name: string; stadiumName: string; city: string; lat: number; lng: number; radiusMeters?: number },
) {
  if (!input.name?.trim()) throw badRequest('Nome do time é obrigatório');
  return db.$transaction(async (tx) => {
    const stadium = await tx.stadium.create({
      data: { name: input.stadiumName, city: input.city, lat: input.lat, lng: input.lng, radiusMeters: input.radiusMeters ?? 300 },
    });
    const team = await tx.team.create({ data: { name: input.name.trim(), homeStadiumId: stadium.id } });
    return { id: team.id, stadiumId: stadium.id };
  });
}

/** "Liberar parceria" (seção 10.3): publica o time + todo o conteúdo dele numa transação. */
export async function releasePartnership(db: PrismaClient, teamId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw notFound('Time não encontrado');
      const now = new Date();
      await tx.team.update({ where: { id: teamId }, data: { status: 'PUBLICADO', partnerStatus: 'ATIVO', publishAt: now } });
      const templates = await tx.template.updateMany({ where: { teamId }, data: { status: 'PUBLICADO', publishAt: now } });
      return { released: true, templatesPublished: templates.count };
    }),
  );
}

/** Pausar parceria (seção 10.2): oculta das telas públicas sem apagar; mintados seguem valendo. */
export async function pausePartnership(db: PrismaClient, teamId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) throw notFound('Time não encontrado');
      await tx.team.update({ where: { id: teamId }, data: { status: 'RASCUNHO', partnerStatus: 'PAUSADO' } });
      const templates = await tx.template.updateMany({ where: { teamId }, data: { status: 'RASCUNHO' } });
      return { paused: true, templatesHidden: templates.count };
    }),
  );
}

// ------------------------------------------------------------------ ciclo de publicação

const CONTENT_TYPES = ['template', 'team', 'series', 'set'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

export async function setContentStatus(
  db: PrismaClient,
  type: string,
  id: string,
  action: 'publish' | 'schedule' | 'end' | 'draft',
  publishAt?: string,
) {
  if (!CONTENT_TYPES.includes(type as ContentType)) throw badRequest('Tipo de conteúdo inválido');
  const data =
    action === 'publish'
      ? { status: 'PUBLICADO', publishAt: new Date() }
      : action === 'schedule'
        ? { status: 'AGENDADO', publishAt: publishAt ? new Date(publishAt) : (() => { throw badRequest('publishAt é obrigatório para agendar'); })() }
        : action === 'end'
          ? { status: 'ENCERRADO' }
          : { status: 'RASCUNHO' };
  // delega ao modelo certo (todos têm status/publishAt)
  const delegate = db[type as ContentType] as unknown as { update: (args: { where: { id: string }; data: unknown }) => Promise<unknown> };
  await delegate.update({ where: { id }, data });
  return { ok: true, status: (data as { status: string }).status };
}

// ------------------------------------------------------------------ cadastro de conteúdo

export async function listTemplatesAdmin(db: PrismaClient) {
  const templates = await db.template.findMany({
    include: { player: true, team: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { title: 'asc' }],
    take: 200,
  });
  return templates.map((t) => ({
    id: t.id,
    title: t.title,
    player: t.player.name,
    team: t.team?.name ?? null,
    tier: t.tier,
    editionType: t.editionType,
    editionSize: t.editionSize,
    mintedCount: t.mintedCount,
    status: t.status,
    publishAt: t.publishAt?.toISOString() ?? null,
  }));
}

export async function createPlayer(db: PrismaClient, input: { name: string; club: string; position: string; jersey: number; nationality: string }) {
  const p = await db.player.create({ data: input });
  return { id: p.id };
}

export async function createTemplate(
  db: PrismaClient,
  input: {
    playerId: string;
    seriesId: string;
    setId?: string;
    teamId?: string;
    title: string;
    playType: string;
    competition: string;
    tier: string;
    editionType: string;
    editionSize?: number;
  },
) {
  if (!Object.values(Tier).includes(input.tier as Tier)) throw badRequest('Tier inválido');
  if (!Object.values(EditionType).includes(input.editionType as EditionType)) throw badRequest('Edição inválida');
  const t = await db.template.create({
    data: {
      playerId: input.playerId,
      seriesId: input.seriesId,
      setId: input.setId ?? null,
      teamId: input.teamId ?? null,
      title: input.title,
      playType: input.playType,
      competition: input.competition,
      matchDate: new Date(),
      tier: input.tier as Tier,
      editionType: input.editionType as EditionType,
      editionSize: input.editionType === 'LIMITADA' ? (input.editionSize ?? 100) : null,
      trajectory: 'M15,80 C30,20 70,20 90,60',
      status: 'RASCUNHO',
    },
  });
  return { id: t.id };
}

export async function createFixtureAdmin(
  db: PrismaClient,
  input: { homeTeamId: string; awayTeamId: string; kickoffAt: string; rewardPackId: string },
) {
  const home = await db.team.findUnique({ where: { id: input.homeTeamId }, include: { homeStadium: true } });
  if (!home?.homeStadium) throw badRequest('Time mandante sem estádio');
  const kickoff = new Date(input.kickoffAt);
  const f = await db.fixture.create({
    data: {
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      stadiumId: home.homeStadium.id,
      kickoffAt: kickoff,
      checkinOpensAt: new Date(kickoff.getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(kickoff.getTime() + 3 * 3_600_000),
      rewardPackId: input.rewardPackId,
    },
  });
  return { id: f.id };
}

export async function listFixturesAdmin(db: PrismaClient) {
  const fixtures = await db.fixture.findMany({
    include: { homeTeam: true, awayTeam: true, stadium: true, _count: { select: { checkIns: true } } },
    orderBy: { kickoffAt: 'asc' },
  });
  return fixtures.map((f) => ({
    id: f.id,
    home: f.homeTeam.name,
    away: f.awayTeam.name,
    stadium: f.stadium.name,
    kickoffAt: f.kickoffAt.toISOString(),
    status: f.status,
    checkins: f._count.checkIns,
  }));
}

/** Mint de cortesia (seção 10.4): minta 1 Moment de um template direto para um usuário. */
export async function courtesyMint(db: PrismaClient, templateId: string, username: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { username } });
      if (!user) throw notFound('Usuário não encontrado');
      const rows = await tx.$queryRaw<Array<{ mintedCount: number }>>(Prisma.sql`
        UPDATE "Template" SET "mintedCount" = "mintedCount" + 1, "circulatingCount" = "circulatingCount" + 1
        WHERE "id" = ${templateId} AND ("editionSize" IS NULL OR "mintedCount" < "editionSize")
        RETURNING "mintedCount"
      `);
      if (rows.length === 0) throw badRequest('Edição esgotada ou template inexistente');
      const tpl = await tx.template.findUnique({ where: { id: templateId }, select: { parallel: true, aspCents: true } });
      const moment = await tx.moment.create({
        data: { templateId, serial: Number(rows[0].mintedCount), ownerId: user.id, parallel: tpl?.parallel ?? 'BASE', acquiredPriceCents: 0, topShotScore: Math.round(((tpl?.aspCents ?? 0) / 100) * 10) },
      });
      await tx.transaction.create({ data: { type: 'REWARD', momentId: moment.id, buyerId: user.id, amountCents: 0 } });
      await recomputeUserScores(tx, user.id);
      return { momentId: moment.id, serial: moment.serial, to: username };
    }),
  );
}

export async function listAuditLog(db: PrismaClient, limit = 50) {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200) });
  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } });
  const nameById = new Map(users.map((u) => [u.id, u.username]));
  return logs.map((l) => ({
    id: l.id,
    by: nameById.get(l.userId) ?? l.userId,
    action: l.action,
    target: l.target,
    meta: l.meta,
    createdAt: l.createdAt.toISOString(),
  }));
}
