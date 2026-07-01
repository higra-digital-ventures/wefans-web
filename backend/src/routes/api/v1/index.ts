import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { systemRoutes } from './system';
import { authRoutes } from './auth';
import { meRoutes } from './me';
import { walletRoutes } from './wallet';
import { teamRoutes } from './teams';
import { catalogRoutes } from './catalog';
import { packRoutes } from './packs';
import { collectionRoutes } from './collection';
import { userRoutes } from './users';
import { marketRoutes } from './market';

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
  await app.register(catalogRoutes);
  await app.register(packRoutes);
  await app.register(collectionRoutes);
  await app.register(userRoutes);
  await app.register(marketRoutes);
}
