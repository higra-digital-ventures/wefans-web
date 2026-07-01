import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { buyPack, getPackDetail, listInventory, listPacks, openPack } from '../../../services/packs';

export async function packRoutes(app: FastifyInstance) {
  app.get('/packs', async () => ({ packs: await listPacks(prisma) }));

  app.get('/packs/inventory', { preHandler: requireAuth }, async (req) => ({
    inventory: await listInventory(prisma, req.userId!),
  }));

  app.get('/packs/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return getPackDetail(prisma, id);
  });

  app.post('/packs/:id/buy', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return buyPack(prisma, req.userId!, id);
  });

  app.post('/packs/inventory/:id/open', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return openPack(prisma, req.userId!, id);
  });
}
