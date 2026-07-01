import type { FastifyInstance } from 'fastify';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { listCollection } from '../../../services/catalog';
import { parseFilters } from './catalog';

export async function collectionRoutes(app: FastifyInstance) {
  app.get('/collection', { preHandler: requireAuth }, async (req) => ({
    moments: await listCollection(prisma, req.userId!, parseFilters(req.query)),
  }));
}
