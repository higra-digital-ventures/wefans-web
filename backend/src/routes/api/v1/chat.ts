import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db';
import { requireAuth } from '../../../lib/auth-context';
import { getThread, listChats, sendMessage } from '../../../services/chat';

const userParam = z.object({ username: z.string().min(1) });
const sendSchema = z.object({ body: z.string().min(1).max(500) });

/** Chat 1:1 (negociação). Tudo autenticado. */
export async function chatRoutes(app: FastifyInstance) {
  app.get('/me/chats', { preHandler: requireAuth }, async (req) => listChats(prisma, req.userId!));

  app.get('/me/chats/:username', { preHandler: requireAuth }, async (req) => {
    const { username } = userParam.parse(req.params);
    return getThread(prisma, req.userId!, username);
  });

  app.post('/me/chats/:username', { preHandler: requireAuth }, async (req) => {
    const { username } = userParam.parse(req.params);
    const { body } = sendSchema.parse(req.body);
    return { message: await sendMessage(prisma, req.userId!, username, body) };
  });
}
