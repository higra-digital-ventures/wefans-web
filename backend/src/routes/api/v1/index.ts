import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { systemRoutes } from './system';
import { authRoutes } from './auth';
import { meRoutes } from './me';
import { walletRoutes } from './wallet';
import { teamRoutes } from './teams';

/**
 * Agregador das rotas da v1. Novas áreas (market, checkin…) são registradas aqui
 * conforme as fases avançam.
 */
export async function apiV1(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(systemRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(walletRoutes);
  await app.register(teamRoutes);
}
