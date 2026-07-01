import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { deposit, getWallet } from '../../../services/wallet';
import { withdrawStub } from '../../../services/ownership';

const depositSchema = z.object({ amountCents: z.number().int().positive().max(100_000_00) });

export async function walletRoutes(app: FastifyInstance) {
  app.get('/wallet', { preHandler: requireAuth }, async (req) =>
    getWallet({ db: prisma, userId: req.userId }),
  );

  app.post('/wallet/deposit', { preHandler: requireAuth }, async (req) => {
    const { amountCents } = depositSchema.parse(req.body);
    return deposit(prisma, req.userId!, amountCents);
  });

  // Fase 13 (stub): saque on-chain / resgate — indisponível até plugar a blockchain.
  app.post('/wallet/withdraw', { preHandler: requireAuth }, async () => withdrawStub());
}
