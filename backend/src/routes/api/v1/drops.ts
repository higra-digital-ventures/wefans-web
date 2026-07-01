import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAdmin, requireAuth } from '../../../lib/auth-context';
import { buyDropPack, getDrop, joinWaitingRoom, listDrops, startDrop } from '../../../services/drops';

const idParam = z.object({ id: z.string() });

export async function dropRoutes(app: FastifyInstance) {
  app.get('/drops', async () => ({ drops: await listDrops(prisma) }));

  app.get('/drops/:id', { preHandler: optionalAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return { drop: await getDrop(prisma, id, req.userId) };
  });

  app.post('/drops/:id/join', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return joinWaitingRoom(prisma, req.userId!, id);
  });

  app.post('/drops/:id/buy', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { packId } = z.object({ packId: z.string() }).parse(req.body);
    return buyDropPack(prisma, req.userId!, id, packId);
  });

  // Admin: gerar a fila / iniciar o drop (seção 10.4).
  app.post('/admin/drops/:id/start', { preHandler: requireAdmin }, async (req) => {
    const { id } = idParam.parse(req.params);
    return startDrop(prisma, id);
  });
}
