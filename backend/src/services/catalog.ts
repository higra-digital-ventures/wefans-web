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
    include: { template: { include: { player: true } }, owner: { select: { username: true } } },
  });
  if (!moment) throw notFound('Momento não encontrado');
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
  };
}

export async function listCollection(db: PrismaClient, userId: string, filters: TemplateFilters) {
  const moments = await db.moment.findMany({
    where: {
      ownerId: userId,
      burned: false,
      ...(filters.tier ? { template: { tier: filters.tier } } : {}),
    },
    include: { template: { include: { player: true } } },
    orderBy: { mintedAt: 'desc' },
  });
  return moments.map(toMomentDTO);
}
