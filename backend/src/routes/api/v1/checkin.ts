import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAdmin, requireAuth } from '../../../lib/auth-context';
import {
  createNonce,
  getActiveFixtures,
  getHistory,
  listReviewCheckins,
  resolveCheckin,
  submitCheckin,
} from '../../../services/checkin';

const checkinSchema = z.object({
  fixtureId: z.string(),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number(),
  isMock: z.boolean().default(false),
  attestationToken: z.string(),
  nonce: z.string(),
});

export async function checkinRoutes(app: FastifyInstance) {
  app.get('/checkin/nonce', { preHandler: requireAuth }, async (req) => createNonce(prisma, req.userId!));

  app.get('/fixtures/active', { preHandler: requireAuth }, async (req) => ({
    fixtures: await getActiveFixtures(prisma, req.userId!),
  }));

  app.post('/checkin', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req) => {
    const input = checkinSchema.parse(req.body);
    const result = await submitCheckin(prisma, req.userId!, input);
    // Logar tudo (A2.2 item 8): coords, accuracy, mock, resultado.
    req.log.info(
      { userId: req.userId, fixtureId: input.fixtureId, lat: input.lat, lng: input.lng, accuracy: input.accuracy, isMock: input.isMock, result: result.status },
      'checkin',
    );
    return result;
  });

  app.get('/checkin/history', { preHandler: requireAuth }, async (req) => ({
    checkins: await getHistory(prisma, req.userId!),
  }));

  // Admin — fila de revisão de fraude (seção 10.4 / 10.5).
  app.get('/admin/checkins/review', { preHandler: requireAdmin }, async () => ({
    checkins: await listReviewCheckins(prisma),
  }));

  app.post('/admin/checkins/:id/resolve', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
    return resolveCheckin(prisma, id, approve);
  });
}
