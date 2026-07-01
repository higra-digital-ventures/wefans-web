import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAdmin, requireAuth } from '../../../lib/auth-context';
import { getLeaderboard, listLeaderboards, lockToLeaderboard, snapshotLeaderboard } from '../../../services/leaderboards';
import { claimChecklist, listChecklists } from '../../../services/checklists';

const idParam = z.object({ id: z.string() });

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get('/leaderboards', { preHandler: optionalAuth }, async (req) => ({
    leaderboards: await listLeaderboards(prisma, req.userId),
  }));

  app.get('/leaderboards/:id', { preHandler: optionalAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return { leaderboard: await getLeaderboard(prisma, id, req.userId) };
  });

  app.post('/leaderboards/:id/lock', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { momentId } = z.object({ momentId: z.string() }).parse(req.body);
    return lockToLeaderboard(prisma, req.userId!, id, momentId);
  });

  // Admin: snapshot encerra e distribui prêmios (seção 10.4).
  app.post('/admin/leaderboards/:id/snapshot', { preHandler: requireAdmin }, async (req) => {
    const { id } = idParam.parse(req.params);
    return snapshotLeaderboard(prisma, id);
  });

  app.get('/checklists', { preHandler: optionalAuth }, async (req) => ({
    checklists: await listChecklists(prisma, req.userId),
  }));

  app.post('/checklists/:id/claim', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return claimChecklist(prisma, req.userId!, id);
  });
}
