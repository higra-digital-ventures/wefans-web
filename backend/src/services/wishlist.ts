import type { PrismaClient } from '@prisma/client';
import { badRequest } from '../lib/errors';
import { toTemplateDTO } from '../lib/dto';

// Wishlist / Lista de desejos (seção 11.13).

export async function listWishlist(db: PrismaClient, userId: string) {
  const items = await db.wishlist.findMany({
    where: { userId },
    include: { template: { include: { player: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return items.map((i) => toTemplateDTO(i.template));
}

export async function addWishlist(db: PrismaClient, userId: string, templateId: string) {
  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template || template.status !== 'PUBLICADO') throw badRequest('Lance indisponível');
  await db.wishlist.upsert({
    where: { userId_templateId: { userId, templateId } },
    create: { userId, templateId },
    update: {},
  });
  return { ok: true, wished: true };
}

export async function removeWishlist(db: PrismaClient, userId: string, templateId: string) {
  await db.wishlist.deleteMany({ where: { userId, templateId } });
  return { ok: true, wished: false };
}
