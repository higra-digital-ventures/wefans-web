import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAdmin } from '../../../lib/auth-context';
import { cronTick } from '../../../jobs/cron';
import {
  audit,
  courtesyMint,
  createFixtureAdmin,
  createPlayer,
  createTeamWithStadium,
  createTemplate,
  getMetrics,
  getPlatformConfig,
  updatePlatformConfig,
  listDropsAdmin,
  createDrop,
  updateDrop,
  cancelDrop,
  listSetsAdmin,
  listPacksAdmin,
  createPack,
  updatePack,
  takePackOffSale,
  deletePack,
  listUsersAdmin,
  setUserSuspended,
  adjustUserBalance,
  payoutTeam,
  listAuditLog,
  listFlaggedTransactions,
  resolveFlaggedTransaction,
  listFixturesAdmin,
  listTeamsAdmin,
  listTemplatesAdmin,
  pausePartnership,
  releasePartnership,
  setContentStatus,
} from '../../../services/admin';

const idParam = z.object({ id: z.string() });

export async function adminRoutes(app: FastifyInstance) {
  // todas as rotas exigem admin
  app.addHook('preHandler', requireAdmin);

  app.get('/admin/metrics', async () => getMetrics(prisma));
  app.get('/admin/audit', async () => ({ logs: await listAuditLog(prisma) }));

  // roda o tick do cron manualmente (promoção de agendados, ofertas, drops, rodadas)
  app.post('/admin/cron/tick', async (req) => {
    const res = await cronTick(prisma, (msg, meta) => req.log.info(meta ?? {}, msg));
    await audit(prisma, req.userId!, 'cron.tick', undefined, res);
    return res;
  });

  // ----- parcerias -----
  app.get('/admin/teams', async () => ({ teams: await listTeamsAdmin(prisma) }));

  // config de royalties (editável): taxas em BPS (0..10000)
  app.get('/admin/config', async () => ({ config: await getPlatformConfig(prisma) }));

  // Drops & Packs (montar lançamentos e pacotes)
  app.get('/admin/drops', async () => ({ drops: await listDropsAdmin(prisma) }));
  app.get('/admin/sets', async () => ({ sets: await listSetsAdmin(prisma) }));
  app.get('/admin/packs', async () => ({ packs: await listPacksAdmin(prisma) }));

  app.post('/admin/drops', async (req) => {
    const input = z
      .object({
        name: z.string().min(1),
        waitingRoomOpensAt: z.string().min(1),
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
        requiredCollectorScore: z.number().int().min(0),
        hasRebound: z.boolean(),
      })
      .parse(req.body);
    const res = await createDrop(prisma, input);
    await audit(prisma, req.userId!, 'drop.create', res.id, { name: input.name });
    return { id: res.id };
  });

  app.post('/admin/packs', async (req) => {
    const input = z
      .object({
        name: z.string().min(1),
        priceCents: z.number().int().min(0),
        momentCount: z.number().int().min(1).max(40),
        totalSupply: z.number().int().min(1),
        guaranteeTier: z.enum(['COMUM', 'TORCIDA', 'RARO', 'LENDARIO', 'GALACTICO']).nullable(),
        odds: z.record(z.string(), z.number().min(0)),
        setId: z.string().nullable(),
        dropId: z.string().nullable(),
        sealed: z.boolean(),
        ticketOnly: z.boolean(),
      })
      .parse(req.body);
    const res = await createPack(prisma, input);
    await audit(prisma, req.userId!, 'pack.create', res.id, { name: input.name });
    return { id: res.id };
  });

  // editar/cancelar drops & packs
  const dropEdit = z.object({
    name: z.string().min(1).optional(),
    waitingRoomOpensAt: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    requiredCollectorScore: z.number().int().min(0).optional(),
    hasRebound: z.boolean().optional(),
  });
  app.post('/admin/drops/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await updateDrop(prisma, id, dropEdit.parse(req.body));
    await audit(prisma, req.userId!, 'drop.update', id);
    return res;
  });
  app.post('/admin/drops/:id/cancel', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await cancelDrop(prisma, id);
    await audit(prisma, req.userId!, 'drop.cancel', id);
    return res;
  });

  const packEdit = z.object({
    name: z.string().min(1).optional(),
    priceCents: z.number().int().min(0).optional(),
    momentCount: z.number().int().min(1).max(40).optional(),
    totalSupply: z.number().int().min(1).optional(),
    guaranteeTier: z.enum(['COMUM', 'TORCIDA', 'RARO', 'LENDARIO', 'GALACTICO']).nullable().optional(),
    odds: z.record(z.string(), z.number().min(0)).optional(),
    setId: z.string().nullable().optional(),
    dropId: z.string().nullable().optional(),
    sealed: z.boolean().optional(),
    ticketOnly: z.boolean().optional(),
  });
  app.post('/admin/packs/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await updatePack(prisma, id, packEdit.parse(req.body));
    await audit(prisma, req.userId!, 'pack.update', id);
    return res;
  });
  app.post('/admin/packs/:id/offsale', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await takePackOffSale(prisma, id);
    await audit(prisma, req.userId!, 'pack.offsale', id);
    return res;
  });
  app.post('/admin/packs/:id/delete', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await deletePack(prisma, id);
    await audit(prisma, req.userId!, 'pack.delete', id);
    return res;
  });

  // gestão de usuários
  app.get('/admin/users', async (req) => {
    const { q, p } = z.object({ q: z.string().optional(), p: z.coerce.number().int().min(1).optional() }).parse(req.query);
    const take = 50;
    return listUsersAdmin(prisma, { q, skip: ((p ?? 1) - 1) * take, take });
  });
  app.post('/admin/users/:id/suspend', async (req) => {
    const { id } = idParam.parse(req.params);
    const { suspended } = z.object({ suspended: z.boolean() }).parse(req.body);
    const res = await setUserSuspended(prisma, id, suspended);
    await audit(prisma, req.userId!, suspended ? 'user.suspend' : 'user.unsuspend', id);
    return res;
  });
  app.post('/admin/users/:id/balance', async (req) => {
    const { id } = idParam.parse(req.params);
    const { deltaCents, memo } = z.object({ deltaCents: z.number().int(), memo: z.string().optional() }).parse(req.body);
    const res = await adjustUserBalance(prisma, id, deltaCents, memo ?? '');
    await audit(prisma, req.userId!, 'user.balance', id, { deltaCents });
    return res;
  });

  // payout de royalties
  app.post('/admin/teams/:id/payout', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await payoutTeam(prisma, id);
    await audit(prisma, req.userId!, 'team.payout', id, res);
    return res;
  });

  app.post('/admin/config', async (req) => {
    const input = z
      .object({
        platformFeeBps: z.number().int().min(0).max(10_000),
        clubRoyaltyBps: z.number().int().min(0).max(10_000),
        primaryClubBps: z.number().int().min(0).max(10_000),
      })
      .parse(req.body);
    const res = await updatePlatformConfig(prisma, input);
    await audit(prisma, req.userId!, 'config.update', 'royalties', res);
    return { config: res };
  });

  app.post('/admin/teams', async (req) => {
    const input = z
      .object({
        name: z.string().min(1),
        stadiumName: z.string().min(1),
        city: z.string().min(1),
        lat: z.number(),
        lng: z.number(),
        radiusMeters: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const res = await createTeamWithStadium(prisma, input);
    await audit(prisma, req.userId!, 'team.create', res.id, { name: input.name });
    return res;
  });

  app.post('/admin/teams/:id/release', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await releasePartnership(prisma, id);
    await audit(prisma, req.userId!, 'partnership.release', id, res);
    return res;
  });

  app.post('/admin/teams/:id/pause', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await pausePartnership(prisma, id);
    await audit(prisma, req.userId!, 'partnership.pause', id, res);
    return res;
  });

  // ----- ciclo de publicação -----
  app.post('/admin/content/:type/:id/status', async (req) => {
    const { type, id } = z.object({ type: z.string(), id: z.string() }).parse(req.params);
    const { action, publishAt } = z
      .object({ action: z.enum(['publish', 'schedule', 'end', 'draft']), publishAt: z.string().optional() })
      .parse(req.body);
    const res = await setContentStatus(prisma, type, id, action, publishAt);
    await audit(prisma, req.userId!, `content.${action}`, `${type}:${id}`, { publishAt });
    return res;
  });

  // ----- cadastro -----
  app.get('/admin/templates', async (req) => {
    const { q, status, p } = z
      .object({ q: z.string().optional(), status: z.string().optional(), p: z.coerce.number().int().min(1).optional() })
      .parse(req.query);
    const take = 50;
    return listTemplatesAdmin(prisma, { q, status, skip: ((p ?? 1) - 1) * take, take });
  });

  app.post('/admin/players', async (req) => {
    const input = z
      .object({ name: z.string().min(1), club: z.string().min(1), position: z.string().min(1), jersey: z.number().int(), nationality: z.string().min(1) })
      .parse(req.body);
    const res = await createPlayer(prisma, input);
    await audit(prisma, req.userId!, 'player.create', res.id, { name: input.name });
    return res;
  });

  app.post('/admin/templates', async (req) => {
    const input = z
      .object({
        playerId: z.string(),
        seriesId: z.string(),
        setId: z.string().optional(),
        teamId: z.string().optional(),
        title: z.string().min(1),
        playType: z.string().min(1),
        competition: z.string().min(1),
        tier: z.string(),
        editionType: z.string(),
        editionSize: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const res = await createTemplate(prisma, input);
    await audit(prisma, req.userId!, 'template.create', res.id, { title: input.title });
    return res;
  });

  // ----- jogos (check-in) -----
  app.get('/admin/fixtures', async () => ({ fixtures: await listFixturesAdmin(prisma) }));

  app.post('/admin/fixtures', async (req) => {
    const input = z
      .object({ homeTeamId: z.string(), awayTeamId: z.string(), kickoffAt: z.string(), rewardPackId: z.string() })
      .parse(req.body);
    const res = await createFixtureAdmin(prisma, input);
    await audit(prisma, req.userId!, 'fixture.create', res.id);
    return res;
  });

  // ----- conduta: revisão de transações monetárias (Fase 12) -----
  app.get('/admin/transactions/flagged', async () => ({
    transactions: await listFlaggedTransactions(prisma),
  }));

  app.post('/admin/transactions/:id/resolve', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await resolveFlaggedTransaction(prisma, id);
    await audit(prisma, req.userId!, 'conduct.resolve_tx', id);
    return res;
  });

  // ----- mint de cortesia -----
  app.post('/admin/mint', async (req) => {
    const { templateId, username } = z.object({ templateId: z.string(), username: z.string().min(1) }).parse(req.body);
    const res = await courtesyMint(prisma, templateId, username);
    await audit(prisma, req.userId!, 'mint.courtesy', templateId, { to: username, serial: res.serial });
    return res;
  });
}
