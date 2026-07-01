import type { PrismaClient } from '@prisma/client';
import type { ServiceContext } from './context';
import { badRequest, unauthorized } from '../lib/errors';
import { toWalletTxDTO } from '../lib/dto';
import { paymentProvider } from './payment';

const MAX_DEPOSIT_CENTS = 100_000_00; // R$ 100.000 por depósito (guarda-corpo)

export async function getWallet(ctx: ServiceContext) {
  const userId = ctx.userId;
  if (!userId) throw unauthorized();
  const [user, txs] = await Promise.all([
    ctx.db.user.findUnique({ where: { id: userId } }),
    ctx.db.walletTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  return { balanceCents: user?.balanceCents ?? 0, transactions: txs.map(toWalletTxDTO) };
}

/** Depósito simulado: chama o PaymentProvider e credita o saldo atomicamente. */
export async function deposit(db: PrismaClient, userId: string, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw badRequest('Valor de depósito inválido');
  if (amountCents > MAX_DEPOSIT_CENTS) throw badRequest('Valor acima do limite por depósito');

  const providerRes = await paymentProvider.processDeposit({ userId, amountCents, memo: 'Depósito simulado' });

  return db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { increment: amountCents } },
    });
    const entry = await tx.walletTransaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amountCents,
        balanceAfterCents: user.balanceCents,
        memo: `Depósito simulado (${providerRes.providerRef})`,
      },
    });
    return { balanceCents: user.balanceCents, entry: toWalletTxDTO(entry) };
  });
}
