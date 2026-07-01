import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import {
  buyPackListing,
  cancelPackListing,
  listMyPacks,
  listPack,
  listPackMarket,
} from '../../../services/pack-market';

const idParam = z.object({ id: z.string() });

export async function packMarketRoutes(app: FastifyInstance) {
  app.get('/pack-market', async () => ({ listings: await listPackMarket(prisma) }));

  app.get('/pack-market/mine', { preHandler: requireAuth }, async (req) => ({
    packs: await listMyPacks(prisma, req.userId!),
  }));

  app.post('/pack-market/list', { preHandler: requireAuth }, async (req) => {
    const { packInventoryId, priceCents } = z
      .object({ packInventoryId: z.string(), priceCents: z.number().int().positive() })
      .parse(req.body);
    return listPack(prisma, req.userId!, packInventoryId, priceCents);
  });

  app.delete('/pack-market/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return cancelPackListing(prisma, req.userId!, id);
  });

  app.post('/pack-market/:id/buy', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return buyPackListing(prisma, req.userId!, id);
  });
}
