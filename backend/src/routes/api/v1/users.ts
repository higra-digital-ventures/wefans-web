import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { getPublicCollection, getPublicProfile, getPublicWishlist } from '../../../services/profile';

// Perfil público — visível a qualquer um (não expõe e-mail/saldo).
export async function userRoutes(app: FastifyInstance) {
  app.get('/users/:username', async (req) => {
    const { username } = z.object({ username: z.string() }).parse(req.params);
    return { profile: await getPublicProfile(prisma, username) };
  });

  app.get('/users/:username/collection', async (req) => {
    const { username } = z.object({ username: z.string() }).parse(req.params);
    return { moments: await getPublicCollection(prisma, username) };
  });

  app.get('/users/:username/wishlist', async (req) => {
    const { username } = z.object({ username: z.string() }).parse(req.params);
    return { templates: await getPublicWishlist(prisma, username) };
  });
}
