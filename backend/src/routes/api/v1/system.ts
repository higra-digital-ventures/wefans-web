import type { FastifyInstance } from 'fastify';
import { prisma } from '../../../db';
import { getSystemStats } from '../../../services/system';

export async function systemRoutes(app: FastifyInstance) {
  app.get('/system/stats', async () => {
    const stats = await getSystemStats({ db: prisma });
    return { stats };
  });
}
