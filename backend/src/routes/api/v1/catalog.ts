import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import {
  getMomentDetail,
  getTemplateCollectors,
  getTemplateDetail,
  listSeries,
  listSets,
  listTemplates,
  type TemplateFilters,
} from '../../../services/catalog';

const filterSchema = z.object({
  tier: z.enum(['COMUM', 'TORCIDA', 'RARO', 'LENDARIO', 'GALACTICO']).optional(),
  setId: z.string().optional(),
  seriesId: z.string().optional(),
  playerId: z.string().optional(),
  teamId: z.string().optional(),
  edition: z.enum(['CIRCULANTE', 'LIMITADA']).optional(),
});

export function parseFilters(query: unknown): TemplateFilters {
  return filterSchema.parse(query ?? {});
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/catalog/series', async () => ({ series: await listSeries(prisma) }));

  app.get('/catalog/sets', async (req) => {
    const { seriesId } = z.object({ seriesId: z.string().optional() }).parse(req.query ?? {});
    return { sets: await listSets(prisma, seriesId) };
  });

  app.get('/catalog/templates', async (req) => ({
    templates: await listTemplates(prisma, parseFilters(req.query)),
  }));

  app.get('/catalog/templates/:id/collectors', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return getTemplateCollectors(prisma, id);
  });

  app.get('/catalog/templates/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return { template: await getTemplateDetail(prisma, id) };
  });

  app.get('/moments/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return { moment: await getMomentDetail(prisma, id) };
  });
}
