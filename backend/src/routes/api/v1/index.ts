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
import { checkinRoutes } from './checkin';
import { momentActionRoutes } from './moment';
import { offerRoutes } from './offers';
import { challengeRoutes } from './challenges';
import { dropRoutes } from './drops';
import { packMarketRoutes } from './pack-market';
import { showcaseRoutes } from './showcases';
import { questRoutes } from './quests';
import { ticketRoutes } from './tickets';
import { leaderboardRoutes } from './leaderboards';
import { fastbreakRoutes } from './fastbreak';
import { feedRoutes } from './feed';
import { chatRoutes } from './chat';
import { adminRoutes } from './admin';

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
  await app.register(checkinRoutes);
  await app.register(momentActionRoutes);
  await app.register(offerRoutes);
  await app.register(challengeRoutes);
  await app.register(dropRoutes);
  await app.register(packMarketRoutes);
  await app.register(showcaseRoutes);
  await app.register(questRoutes);
  await app.register(ticketRoutes);
  await app.register(leaderboardRoutes);
  await app.register(fastbreakRoutes);
  await app.register(feedRoutes);
  await app.register(chatRoutes);
  await app.register(adminRoutes); // preHandler requireAdmin no plugin inteiro
}
