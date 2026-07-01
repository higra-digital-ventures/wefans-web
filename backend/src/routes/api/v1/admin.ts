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
  listAuditLog,
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
  app.get('/admin/templates', async () => ({ templates: await listTemplatesAdmin(prisma) }));

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

  // ----- mint de cortesia -----
  app.post('/admin/mint', async (req) => {
    const { templateId, username } = z.object({ templateId: z.string(), username: z.string().min(1) }).parse(req.body);
    const res = await courtesyMint(prisma, templateId, username);
    await audit(prisma, req.userId!, 'mint.courtesy', templateId, { to: username, serial: res.serial });
    return res;
  });
}
