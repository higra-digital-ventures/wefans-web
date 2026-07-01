import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { burnMoment, giftMoment, lockMoment } from '../../../services/moment';
import { redeemMomentForTicket } from '../../../services/tickets';

const idParam = z.object({ id: z.string() });

export async function momentActionRoutes(app: FastifyInstance) {
  app.post('/moments/:id/lock', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return lockMoment(prisma, req.userId!, id);
  });

  app.post('/moments/:id/burn', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return burnMoment(prisma, req.userId!, id);
  });

  app.post('/moments/:id/gift', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { toUsername } = z.object({ toUsername: z.string().min(1) }).parse(req.body);
    return giftMoment(prisma, req.userId!, id, toUsername);
  });

  // Trocar o Momento por 1 Ficha de Troca (queima o Momento) — regra 13.
  app.post('/moments/:id/redeem-ticket', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return redeemMomentForTicket(prisma, req.userId!, id);
  });
}
