import type { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { toShowcaseDTO } from '../lib/dto';

const momentInclude = { moment: { include: { template: { include: { player: true } } } } };

export async function listPublicShowcases(db: PrismaClient) {
  const s = await db.showcase.findMany({
    where: { public: true },
    include: { owner: { select: { username: true } }, _count: { select: { items: true } } },
    orderBy: { id: 'desc' },
    take: 60,
  });
  return s.map(toShowcaseDTO);
}

export async function listMyShowcases(db: PrismaClient, userId: string) {
  const s = await db.showcase.findMany({
    where: { ownerId: userId },
    include: { _count: { select: { items: true } } },
    orderBy: { id: 'desc' },
  });
  return s.map(toShowcaseDTO);
}

export async function getShowcase(db: PrismaClient, id: string, viewerId?: string) {
  const s = await db.showcase.findUnique({
    where: { id },
    include: { owner: { select: { username: true } }, items: { include: momentInclude, orderBy: { order: 'asc' } } },
  });
  if (!s) throw notFound('Vitrine não encontrada');
  if (!s.public && s.ownerId !== viewerId) throw notFound('Vitrine não encontrada');
  return { ...toShowcaseDTO(s), isOwner: s.ownerId === viewerId };
}

export async function createShowcase(db: PrismaClient, userId: string, input: { name: string; description?: string; public?: boolean }) {
  if (!input.name?.trim()) throw badRequest('Dê um nome à vitrine');
  const s = await db.showcase.create({
    data: { ownerId: userId, name: input.name.trim(), description: input.description ?? '', public: input.public ?? true },
  });
  return toShowcaseDTO(s);
}

export async function updateShowcase(db: PrismaClient, userId: string, id: string, input: { name?: string; description?: string; public?: boolean }) {
  const s = await db.showcase.findUnique({ where: { id } });
  if (!s || s.ownerId !== userId) throw notFound('Vitrine não encontrada');
  const upd = await db.showcase.update({
    where: { id },
    data: { name: input.name ?? s.name, description: input.description ?? s.description, public: input.public ?? s.public },
  });
  return toShowcaseDTO(upd);
}

export async function deleteShowcase(db: PrismaClient, userId: string, id: string) {
  const s = await db.showcase.findUnique({ where: { id } });
  if (!s || s.ownerId !== userId) throw notFound('Vitrine não encontrada');
  await db.$transaction([
    db.showcaseItem.deleteMany({ where: { showcaseId: id } }),
    db.showcase.delete({ where: { id } }),
  ]);
  return { ok: true };
}

export async function addItem(db: PrismaClient, userId: string, showcaseId: string, momentId: string) {
  const s = await db.showcase.findUnique({ where: { id: showcaseId } });
  if (!s || s.ownerId !== userId) throw notFound('Vitrine não encontrada');
  const moment = await db.moment.findUnique({ where: { id: momentId } });
  if (!moment || moment.ownerId !== userId || moment.burned) throw badRequest('Momento inválido');
  if (await db.showcaseItem.findFirst({ where: { showcaseId, momentId } })) throw badRequest('Lance já está na vitrine');
  const count = await db.showcaseItem.count({ where: { showcaseId } });
  await db.showcaseItem.create({ data: { showcaseId, momentId, order: count } });
  return { ok: true };
}

export async function removeItem(db: PrismaClient, userId: string, showcaseId: string, momentId: string) {
  const s = await db.showcase.findUnique({ where: { id: showcaseId } });
  if (!s || s.ownerId !== userId) throw notFound('Vitrine não encontrada');
  await db.showcaseItem.deleteMany({ where: { showcaseId, momentId } });
  return { ok: true };
}
