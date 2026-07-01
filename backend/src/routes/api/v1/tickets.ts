import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { listTicketPacks, redeemTicketsForPack } from '../../../services/tickets';

export async function ticketRoutes(app: FastifyInstance) {
  app.get('/tickets/packs', async () => ({ packs: await listTicketPacks(prisma) }));

  app.post('/tickets/packs/:id/redeem', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return redeemTicketsForPack(prisma, req.userId!, id);
  });
}
