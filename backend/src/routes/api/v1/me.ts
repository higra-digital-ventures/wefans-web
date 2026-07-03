import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { getMe, getMyStats, updateFavoriteTeam, updateShowInFeed } from '../../../services/profile';
import { addWishlist, listWishlist, removeWishlist } from '../../../services/wishlist';

const updateMeSchema = z
  .object({
    favoriteTeamId: z.string().min(1).nullable().optional(),
    showInFeed: z.boolean().optional(),
  })
  .refine((b) => b.favoriteTeamId !== undefined || b.showInFeed !== undefined, {
    message: 'nada para atualizar',
  });
const templateParam = z.object({ templateId: z.string() });

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireAuth }, async (req) => ({
    user: await getMe({ db: prisma, userId: req.userId }),
  }));

  app.patch('/me', { preHandler: requireAuth }, async (req) => {
    const { favoriteTeamId, showInFeed } = updateMeSchema.parse(req.body);
    let user;
    if (favoriteTeamId !== undefined) user = await updateFavoriteTeam(prisma, req.userId!, favoriteTeamId);
    if (showInFeed !== undefined) user = await updateShowInFeed(prisma, req.userId!, showInFeed);
    return { user };
  });

  app.get('/me/stats', { preHandler: requireAuth }, async (req) => getMyStats(prisma, req.userId!));

  app.get('/me/wishlist', { preHandler: requireAuth }, async (req) => ({
    templates: await listWishlist(prisma, req.userId!),
  }));

  app.post('/me/wishlist/:templateId', { preHandler: requireAuth }, async (req) => {
    const { templateId } = templateParam.parse(req.params);
    return addWishlist(prisma, req.userId!, templateId);
  });

  app.delete('/me/wishlist/:templateId', { preHandler: requireAuth }, async (req) => {
    const { templateId } = templateParam.parse(req.params);
    return removeWishlist(prisma, req.userId!, templateId);
  });
}
