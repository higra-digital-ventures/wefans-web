import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAdmin, requireAuth } from '../../../lib/auth-context';
import { closeDay, getDay, listRuns, runLeaderboard, submitLineup } from '../../../services/fastbreak';

const idParam = z.object({ id: z.string() });

export async function fastbreakRoutes(app: FastifyInstance) {
  app.get('/fastbreak', { preHandler: optionalAuth }, async (req) => ({
    runs: await listRuns(prisma, req.userId),
  }));

  app.get('/fastbreak/days/:id', { preHandler: optionalAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return { day: await getDay(prisma, id, req.userId) };
  });

  app.post('/fastbreak/days/:id/lineup', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { momentIds, captainMomentId } = z
      .object({ momentIds: z.array(z.string()).min(1), captainMomentId: z.string().optional() })
      .parse(req.body);
    return submitLineup(prisma, req.userId!, id, momentIds, captainMomentId);
  });

  app.get('/fastbreak/runs/:id/leaderboard', async (req) => {
    const { id } = idParam.parse(req.params);
    return { leaderboard: await runLeaderboard(prisma, id) };
  });

  // Admin/cron: fecha a rodada e calcula os resultados (seção 8/10).
  app.post('/admin/fastbreak/days/:id/close', { preHandler: requireAdmin }, async (req) => {
    const { id } = idParam.parse(req.params);
    return closeDay(prisma, id);
  });
}
