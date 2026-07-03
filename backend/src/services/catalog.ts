import { Prisma, type PrismaClient, type Tier, type EditionType } from '@prisma/client';
import { notFound } from '../lib/errors';
import { toMomentDTO, toTemplateDetailDTO, toTemplateDTO, toTransactionDTO } from '../lib/dto';

// Regra de visibilidade (seção 10.1): queries públicas só enxergam PUBLICADO.

export async function listSeries(db: PrismaClient) {
  return db.series.findMany({ where: { status: 'PUBLICADO' }, orderBy: { startsAt: 'desc' } });
}

export async function listSets(db: PrismaClient, seriesId?: string) {
  return db.set.findMany({
    where: { status: 'PUBLICADO', ...(seriesId ? { seriesId } : {}) },
    orderBy: { name: 'asc' },
  });
}

export interface TemplateFilters {
  tier?: Tier;
  setId?: string;
  seriesId?: string;
  playerId?: string;
  teamId?: string;
  edition?: EditionType;
}

export async function listTemplates(db: PrismaClient, filters: TemplateFilters) {
  const templates = await db.template.findMany({
    where: {
      status: 'PUBLICADO',
      ...(filters.tier ? { tier: filters.tier } : {}),
      ...(filters.setId ? { setId: filters.setId } : {}),
      ...(filters.seriesId ? { seriesId: filters.seriesId } : {}),
      ...(filters.playerId ? { playerId: filters.playerId } : {}),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
      ...(filters.edition ? { editionType: filters.edition } : {}),
    },
    include: { player: true },
    orderBy: [{ tier: 'desc' }, { title: 'asc' }],
    take: 120,
  });
  return templates.map(toTemplateDTO);
}

export async function getTemplateDetail(db: PrismaClient, id: string) {
  const template = await db.template.findUnique({ where: { id }, include: { player: true } });
  if (!template || template.status !== 'PUBLICADO') throw notFound('Lance não encontrado');
  const listed = await db.listing.count({ where: { moment: { templateId: id }, status: 'ACTIVE' } });
  const burned = template.mintedCount - template.circulatingCount;
  return toTemplateDetailDTO(template, {
    existing: template.mintedCount,
    circulating: template.circulatingCount,
    burned,
    listed,
  });
}

export async function getMomentDetail(db: PrismaClient, id: string) {
  const moment = await db.moment.findUnique({
    where: { id },
    include: { template: { include: { player: true } }, owner: { select: { username: true } }, listing: true },
  });
  if (!moment) throw notFound('Momento não encontrado');
  const activeListing =
    moment.listing && moment.listing.status === 'ACTIVE'
      ? { id: moment.listing.id, priceCents: moment.listing.priceCents }
      : null;
  // Procedência: histórico de transações do Moment (MINT já gravado; BUY/SELL/GIFT na Fase 4/5).
  const txs = await db.transaction.findMany({
    where: { momentId: id },
    include: { buyer: { select: { username: true } }, seller: { select: { username: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return {
    ...toMomentDTO(moment),
    ownerUsername: moment.owner?.username ?? null,
    provenance: txs.map(toTransactionDTO),
    listing: activeListing,
  };
}

export async function listCollection(db: PrismaClient, userId: string, filters: TemplateFilters) {
  const moments = await db.moment.findMany({
    where: {
      ownerId: userId,
      burned: false,
      ...(filters.tier ? { template: { tier: filters.tier } } : {}),
    },
    include: { template: { include: { player: true } }, listing: true },
    orderBy: { mintedAt: 'desc' },
  });
  return moments.map(toMomentDTO);
}

/** Top Collectors + Special Serials da edição (anatomia da Moment page do Top Shot). */
export async function getTemplateCollectors(db: PrismaClient, templateId: string) {
  const template = await db.template.findUnique({
    where: { id: templateId },
    include: { player: { select: { jersey: true } } },
  });
  if (!template) return { topCollectors: [], specialSerials: [] };

  const grouped = await db.moment.groupBy({
    by: ['ownerId'],
    where: { templateId, burned: false, ownerId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { ownerId: 'desc' } },
    take: 5,
  });
  const owners = await db.user.findMany({
    where: { id: { in: grouped.map((g) => g.ownerId!) } },
    select: { id: true, username: true },
  });
  const nameOf = new Map(owners.map((o) => [o.id, o.username]));
  const topCollectors = grouped.map((g) => ({
    username: nameOf.get(g.ownerId!) ?? '—',
    count: g._count._all,
  }));

  // serials de prestígio: #1, a última da tiragem e o número da camisa (jersey match)
  const wanted = new Map<number, string>([[1, 'Primeira cunhagem']]);
  if (template.editionSize) wanted.set(template.editionSize, 'Última da tiragem');
  wanted.set(template.player.jersey, 'Número da camisa');
  const specials = await db.moment.findMany({
    where: { templateId, serial: { in: [...wanted.keys()] } },
    include: { owner: { select: { username: true } } },
    orderBy: { serial: 'asc' },
  });
  const specialSerials = specials.map((m) => ({
    serial: m.serial,
    label: wanted.get(m.serial) ?? '',
    owner: m.burned ? null : (m.owner?.username ?? null),
    burned: m.burned,
    momentId: m.id,
  }));

  return { topCollectors, specialSerials };
}
