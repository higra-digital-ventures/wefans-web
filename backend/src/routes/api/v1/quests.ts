import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAuth } from '../../../lib/auth-context';
import { claimQuest, listQuests } from '../../../services/quests';

export async function questRoutes(app: FastifyInstance) {
  app.get('/quests', { preHandler: optionalAuth }, async (req) => ({
    quests: await listQuests(prisma, req.userId),
  }));

  app.post('/quests/:id/claim', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return claimQuest(prisma, req.userId!, id);
  });
}
