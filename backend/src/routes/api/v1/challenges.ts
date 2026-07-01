import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAuth } from '../../../lib/auth-context';
import { getChallenge, listChallenges, submitChallenge } from '../../../services/challenges';

const idParam = z.object({ id: z.string() });

export async function challengeRoutes(app: FastifyInstance) {
  app.get('/challenges', { preHandler: optionalAuth }, async (req) => ({
    challenges: await listChallenges(prisma, req.userId),
  }));

  app.get('/challenges/:id', { preHandler: optionalAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return { challenge: await getChallenge(prisma, id, req.userId) };
  });

  app.post('/challenges/:id/submit', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    // FLASH não exige Moments (critério é avaliado contra as stats simuladas).
    const { momentIds } = z.object({ momentIds: z.array(z.string()).default([]) }).parse(req.body ?? {});
    return submitChallenge(prisma, req.userId!, id, momentIds);
  });
}
