import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { getMe, updateFavoriteTeam } from '../../../services/profile';

const updateMeSchema = z.object({ favoriteTeamId: z.string().min(1).nullable() });

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireAuth }, async (req) => ({
    user: await getMe({ db: prisma, userId: req.userId }),
  }));

  app.patch('/me', { preHandler: requireAuth }, async (req) => {
    const { favoriteTeamId } = updateMeSchema.parse(req.body);
    return { user: await updateFavoriteTeam(prisma, req.userId!, favoriteTeamId) };
  });
}
