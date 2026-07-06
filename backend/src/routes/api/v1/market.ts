import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import {
  buyMoment,
  cancelListing,
  createListing,
  getTemplateMarket,
  listMarket,
  listRecentSales,
} from '../../../services/market';
import { getHotPlayersToday } from '../../../services/performance';

const tierEnum = z.enum(['COMUM', 'TORCIDA', 'RARO', 'LENDARIO', 'GALACTICO']);
const marketQuery = z.object({
  tier: tierEnum.optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).optional(),
});
const createSchema = z.object({ momentId: z.string(), priceCents: z.number().int().positive() });
const idParam = z.object({ id: z.string() });

export async function marketRoutes(app: FastifyInstance) {
  app.get('/market', async (req) => {
    const { tier, sort } = marketQuery.parse(req.query ?? {});
    return { listings: await listMarket(prisma, { tier }, sort ?? 'recent') };
  });

  // pulso do dia: artilheiros do matchSim — performance vira sinal de mercado
  app.get('/market/pulse', async () => ({ hot: await getHotPlayersToday(prisma) }));

  app.get('/market/activity', async (req) => {
    const { limit } = z.object({ limit: z.coerce.number().int().positive().max(50).optional() }).parse(req.query ?? {});
    return { sales: await listRecentSales(prisma, limit ?? 25) };
  });

  app.get('/market/template/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    return getTemplateMarket(prisma, id);
  });

  app.post('/listings', { preHandler: requireAuth }, async (req) => {
    const { momentId, priceCents } = createSchema.parse(req.body);
    return { listing: await createListing(prisma, req.userId!, momentId, priceCents) };
  });

  app.delete('/listings/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return cancelListing(prisma, req.userId!, id);
  });

  app.post('/listings/:id/buy', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return buyMoment(prisma, req.userId!, id);
  });
}
