import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { acceptOffer, cancelOffer, createOffer, listMyOffers, listOffersForMoment } from '../../../services/offers';

const createSchema = z.object({
  momentId: z.string().optional(),
  templateId: z.string().optional(),
  priceCents: z.number().int().positive(),
  expiresAt: z.string().optional(),
});
const idParam = z.object({ id: z.string() });

export async function offerRoutes(app: FastifyInstance) {
  app.post('/offers', { preHandler: requireAuth }, async (req) => ({
    offer: await createOffer(prisma, req.userId!, createSchema.parse(req.body)),
  }));

  app.get('/offers/mine', { preHandler: requireAuth }, async (req) => ({
    offers: await listMyOffers(prisma, req.userId!),
  }));

  app.delete('/offers/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    return cancelOffer(prisma, req.userId!, id);
  });

  app.post('/offers/:id/accept', { preHandler: requireAuth }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { momentId } = z.object({ momentId: z.string().optional() }).parse(req.body ?? {});
    return acceptOffer(prisma, req.userId!, id, momentId);
  });

  // Público: ofertas que miram este Momento (serial) ou a edição dele.
  app.get('/moments/:id/offers', async (req) => {
    const { id } = idParam.parse(req.params);
    return { offers: await listOffersForMoment(prisma, id) };
  });
}
