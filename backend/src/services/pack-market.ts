import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';
import { toPackDTO } from '../lib/dto';
import { withDbRetry } from '../lib/tx';

const FEE_BPS = 500; // 5%

/** Pacotes lacrados à venda no Mercado de Pacotes (item 11). */
export async function listPackMarket(db: PrismaClient) {
  const listings = await db.packListing.findMany({
    where: { status: 'ACTIVE' },
    include: { packInventory: { include: { pack: true } }, seller: { select: { username: true } } },
    orderBy: { priceCents: 'asc' },
  });
  return listings.map((l) => ({
    id: l.id,
    priceCents: l.priceCents,
    seller: l.seller.username,
    packInventoryId: l.packInventoryId,
    createdAt: l.createdAt.toISOString(),
    pack: toPackDTO(l.packInventory.pack),
  }));
}

/** Pacotes lacrados do usuário (para revender). */
export async function listMyPacks(db: PrismaClient, userId: string) {
  const inv = await db.packInventory.findMany({
    where: { ownerId: userId, opened: false },
    include: { pack: true, packListing: true },
    orderBy: { createdAt: 'desc' },
  });
  return inv.map((i) => ({
    id: i.id,
    pack: toPackDTO(i.pack),
    listed: i.packListing?.status === 'ACTIVE',
    listingId: i.packListing?.status === 'ACTIVE' ? i.packListing.id : null,
    priceCents: i.packListing?.status === 'ACTIVE' ? i.packListing.priceCents : null,
  }));
}

export async function listPack(db: PrismaClient, userId: string, packInventoryId: string, priceCents: number) {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw badRequest('Preço inválido');
  const inv = await db.packInventory.findUnique({ where: { id: packInventoryId } });
  if (!inv || inv.ownerId !== userId) throw notFound('Pacote não encontrado');
  if (inv.opened) throw badRequest('Pacote já aberto não pode ser vendido');
  await db.packListing.upsert({
    where: { packInventoryId },
    create: { packInventoryId, sellerId: userId, priceCents, status: 'ACTIVE' },
    update: { sellerId: userId, priceCents, status: 'ACTIVE' },
  });
  return { listed: true };
}

export async function cancelPackListing(db: PrismaClient, userId: string, listingId: string) {
  const l = await db.packListing.findUnique({ where: { id: listingId } });
  if (!l || l.sellerId !== userId) throw notFound('Anúncio não encontrado');
  if (l.status !== 'ACTIVE') throw badRequest('Anúncio não está ativo');
  await db.packListing.update({ where: { id: listingId }, data: { status: 'CANCELLED' } });
  return { ok: true };
}

export async function buyPackListing(db: PrismaClient, buyerId: string, listingId: string) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const l = await tx.packListing.findUnique({ where: { id: listingId }, include: { packInventory: { include: { pack: true } } } });
      if (!l || l.status !== 'ACTIVE') throw badRequest('Anúncio indisponível');
      if (l.sellerId === buyerId) throw badRequest('Não é possível comprar o próprio pacote');
      if (l.packInventory.opened) throw badRequest('Pacote já foi aberto');

      const price = l.priceCents;
      const fee = Math.round((price * FEE_BPS) / 10_000);
      const proceeds = price - fee;

      const rows = await tx.$queryRaw<Array<{ balanceCents: number }>>(Prisma.sql`
        UPDATE "User" SET "balanceCents" = "balanceCents" - ${price}
        WHERE "id" = ${buyerId} AND "balanceCents" >= ${price}
        RETURNING "balanceCents"
      `);
      if (rows.length === 0) throw badRequest('Saldo insuficiente');
      const balanceAfter = Number(rows[0].balanceCents);
      const seller = await tx.user.update({ where: { id: l.sellerId }, data: { balanceCents: { increment: proceeds } } });

      await tx.packInventory.update({ where: { id: l.packInventoryId }, data: { ownerId: buyerId } });
      await tx.packListing.update({ where: { id: l.id }, data: { status: 'SOLD' } });
      await tx.walletTransaction.create({ data: { userId: buyerId, type: 'PURCHASE', amountCents: -price, balanceAfterCents: balanceAfter, memo: `Compra de pacote lacrado: ${l.packInventory.pack.name}` } });
      await tx.walletTransaction.create({ data: { userId: l.sellerId, type: 'SALE', amountCents: proceeds, balanceAfterCents: seller.balanceCents, memo: `Venda de pacote lacrado (taxa ${fee})` } });
      return { packInventoryId: l.packInventoryId, balanceCents: balanceAfter };
    }),
  );
}
