import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { systemRoutes } from './system';

/**
 * Agregador das rotas da v1. Novas áreas (auth, wallet, market, checkin…) são
 * registradas aqui conforme as fases avançam.
 */
export async function apiV1(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(systemRoutes);
}
