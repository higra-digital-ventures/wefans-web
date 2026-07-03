import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { getFeed, getFeedPopular } from '../../../services/feed';

/** Feed público do Explorar (eventos da economia + populares 24h). */
export async function feedRoutes(app: FastifyInstance) {
  app.get('/feed', async (req) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().positive().max(60).optional() })
      .parse(req.query ?? {});
    const [events, popular] = await Promise.all([getFeed(prisma, limit ?? 30), getFeedPopular(prisma)]);
    return { events, popular };
  });
}
