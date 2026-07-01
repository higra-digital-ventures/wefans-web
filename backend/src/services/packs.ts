import { Prisma, type PrismaClient } from '@prisma/client';
import { badRequest, conflict, notFound } from '../lib/errors';
import { toMomentDTO, toPackDTO, toPackInventoryDTO, toTemplateDTO } from '../lib/dto';
import { withDbRetry } from '../lib/tx';
import { mintPack } from './mint';

/** Pacotes à venda (não-ticketOnly, com estoque). Drop/fila entram na Fase 6. */
export async function listPacks(db: PrismaClient) {
  const packs = await db.pack.findMany({
    where: { ticketOnly: false },
    orderBy: { priceCents: 'asc' },
  });
  return packs.map(toPackDTO);
}

/** Detalhe do pacote + Lances possíveis (catálogo publicado) agrupados por tier (seção 11.6). */
export async function getPackDetail(db: PrismaClient, packId: string) {
  const pack = await db.pack.findUnique({ where: { id: packId } });
  if (!pack) throw notFound('Pacote não encontrado');
  const templates = await db.template.findMany({
    where: { status: 'PUBLICADO' },
    include: { player: true },
    orderBy: [{ tier: 'desc' }, { title: 'asc' }],
  });
  return { pack: toPackDTO(pack), possibleLances: templates.map(toTemplateDTO) };
}

export async function listInventory(db: PrismaClient, userId: string) {
  const inv = await db.packInventory.findMany({
    where: { ownerId: userId, opened: false },
    include: { pack: true },
    orderBy: { createdAt: 'desc' },
  });
  return inv.map(toPackInventoryDTO);
}

/** Compra de pacote: debita saldo e cria PackInventory lacrado. Atômico e sem overspend. */
const TX_OPTS = { timeout: 15_000, maxWait: 10_000 } as const;

export async function buyPack(db: PrismaClient, userId: string, packId: string) {
  return withDbRetry(() => db.$transaction(async (tx) => {
    const pack = await tx.pack.findUnique({ where: { id: packId } });
    if (!pack) throw notFound('Pacote não encontrado');
    if (pack.ticketOnly) throw badRequest('Pacote trocável apenas por Fichas de Troca');

    // Reserva de estoque atômica.
    const reserved = await tx.pack.updateMany({
      where: { id: packId, soldCount: { lt: pack.totalSupply } },
      data: { soldCount: { increment: 1 } },
    });
    if (reserved.count === 0) throw conflict('Pacote esgotado');

    // Débito atômico (não deixa saldo negativo).
    let balanceAfter = 0;
    if (pack.priceCents > 0) {
      const rows = await tx.$queryRaw<Array<{ balanceCents: number }>>(Prisma.sql`
        UPDATE "User" SET "balanceCents" = "balanceCents" - ${pack.priceCents}
        WHERE "id" = ${userId} AND "balanceCents" >= ${pack.priceCents}
        RETURNING "balanceCents"
      `);
      if (rows.length === 0) throw badRequest('Saldo insuficiente');
      balanceAfter = Number(rows[0].balanceCents);
      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amountCents: -pack.priceCents,
          balanceAfterCents: balanceAfter,
          memo: `Compra de pacote: ${pack.name}`,
        },
      });
    } else {
      const user = await tx.user.findUnique({ where: { id: userId } });
      balanceAfter = user?.balanceCents ?? 0;
    }

    const inventory = await tx.packInventory.create({ data: { packId, ownerId: userId } });
    return { inventoryId: inventory.id, balanceCents: balanceAfter };
  }, TX_OPTS));
}

/** Abre um pacote lacrado do usuário e minta os Moments (revelação no frontend). */
export async function openPack(db: PrismaClient, userId: string, inventoryId: string) {
  return withDbRetry(() => db.$transaction(async (tx) => {
    const inv = await tx.packInventory.findUnique({ where: { id: inventoryId }, include: { pack: true } });
    if (!inv || inv.ownerId !== userId) throw notFound('Pacote não encontrado');
    if (inv.opened) throw badRequest('Pacote já foi aberto');

    await tx.packInventory.update({ where: { id: inventoryId }, data: { opened: true } });
    const moments = await mintPack(tx, userId, inv.pack);
    return { moments: moments.map(toMomentDTO) };
  }, TX_OPTS));
}
