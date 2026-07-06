import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { optionalAuth, requireAuth } from '../../../lib/auth-context';
import { getFeed, getFeedPopular } from '../../../services/feed';

/** Feed público do Explorar (eventos da economia + populares 24h + reações 🔥). */
export async function feedRoutes(app: FastifyInstance) {
  app.get('/feed', { preHandler: optionalAuth }, async (req) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().positive().max(120).optional() })
      .parse(req.query ?? {});
    const [events, popular] = await Promise.all([getFeed(prisma, limit ?? 30), getFeedPopular(prisma)]);

    // reações por evento (contagem pública) + as do próprio usuário (se logado)
    const keys = events.map((e) => e.id);
    const [grouped, mine] = await Promise.all([
      prisma.feedReaction.groupBy({
        by: ['eventKey'],
        where: { eventKey: { in: keys } },
        _count: { eventKey: true },
      }),
      req.userId
        ? prisma.feedReaction.findMany({
            where: { userId: req.userId, eventKey: { in: keys } },
            select: { eventKey: true },
          })
        : Promise.resolve([] as { eventKey: string }[]),
    ]);
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.eventKey] = g._count.eventKey;

    return { events, popular, reactions: { counts, mine: mine.map((m) => m.eventKey) } };
  });

  // 🔥 alterna a reação do usuário num evento do feed
  app.post('/feed/react', { preHandler: requireAuth }, async (req) => {
    const { eventKey } = z.object({ eventKey: z.string().min(1).max(80) }).parse(req.body ?? {});
    const userId = req.userId!;
    const existing = await prisma.feedReaction.findUnique({
      where: { userId_eventKey: { userId, eventKey } },
    });
    if (existing) await prisma.feedReaction.delete({ where: { id: existing.id } });
    else await prisma.feedReaction.create({ data: { userId, eventKey } });
    const count = await prisma.feedReaction.count({ where: { eventKey } });
    return { reacted: !existing, count };
  });
}
