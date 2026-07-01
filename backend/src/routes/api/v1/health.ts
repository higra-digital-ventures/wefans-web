import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'wefans-api',
    version: 'v1',
    time: new Date().toISOString(),
  }));
}
