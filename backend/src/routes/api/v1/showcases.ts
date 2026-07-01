import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAuth } from '../../../lib/auth-context';
import {
  addItem,
  createShowcase,
  deleteShowcase,
  getShowcase,
  listMyShowcases,
  listPublicShowcases,
  removeItem,
  updateShowcase,
} from '../../../services/showcases';

const idParam = z.object({ id: z.string() });
const createSchema = z.object({ name: z.string().min(1), description: z.string().optional(), public: z.boolean().optional() });
const updateSchema = z.object({ name: z.string().optional(), description: z.string().optional(), public: z.boolean().optional() });

export async function showcaseRoutes(app: FastifyInstance) {
  app.get('/showcases', async () => ({ showcases: await listPublicShowcases(prisma) }));

  app.get('/showcases/mine', { preHandler: requireAuth }, async (req) => ({
    showcases: await listMyShowcases(prisma, req.userId!),
  }));

  app.get('/showcases/:id', { preHandler: optionalAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return { showcase: await getShowcase(prisma, id, req.userId) };
  });

  app.post('/showcases', { preHandler: requireAuth }, async (req) => ({
    showcase: await createShowcase(prisma, req.userId!, createSchema.parse(req.body)),
  }));

  app.patch('/showcases/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return { showcase: await updateShowcase(prisma, req.userId!, id, updateSchema.parse(req.body)) };
  });

  app.delete('/showcases/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return deleteShowcase(prisma, req.userId!, id);
  });

  app.post('/showcases/:id/items', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { momentId } = z.object({ momentId: z.string() }).parse(req.body);
    return addItem(prisma, req.userId!, id, momentId);
  });

  app.delete('/showcases/:id/items/:momentId', { preHandler: requireAuth }, async (req) => {
    const { id, momentId } = z.object({ id: z.string(), momentId: z.string() }).parse(req.params);
    return removeItem(prisma, req.userId!, id, momentId);
  });
}
