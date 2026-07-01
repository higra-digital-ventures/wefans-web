import type { FastifyInstance } from 'fastify';
import { prisma } from '../../../db';
import { listPublishedTeams } from '../../../services/profile';

export async function teamRoutes(app: FastifyInstance) {
  // Público: só times PUBLICADO (regra de visibilidade, seção 10.1).
  app.get('/teams', async () => ({ teams: await listPublishedTeams(prisma) }));
}
