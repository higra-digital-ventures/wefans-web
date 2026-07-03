import type { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../lib/errors';

/**
 * Chat 1:1 entre colecionadores (negociação de Lances). Conversas são derivadas
 * das mensagens (par de usuários) — sem tabela de "conversa". Leitura marca
 * `readAt` nas mensagens recebidas daquele parceiro.
 */

const MAX_BODY = 500;

export async function listChats(db: PrismaClient, userId: string) {
  const [recent, unreadGroups] = await Promise.all([
    db.chatMessage.findMany({
      where: { OR: [{ fromId: userId }, { toId: userId }] },
      include: {
        from: { select: { id: true, username: true } },
        to: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.chatMessage.groupBy({
      by: ['fromId'],
      where: { toId: userId, readAt: null },
      _count: { _all: true },
    }),
  ]);

  const unreadBy = new Map(unreadGroups.map((g) => [g.fromId, g._count._all]));
  const chats: {
    username: string;
    lastBody: string;
    lastAt: string;
    lastMine: boolean;
    unread: number;
  }[] = [];
  const seen = new Set<string>();
  for (const m of recent) {
    const partner = m.fromId === userId ? m.to : m.from;
    if (seen.has(partner.id)) continue;
    seen.add(partner.id);
    chats.push({
      username: partner.username,
      lastBody: m.body,
      lastAt: m.createdAt.toISOString(),
      lastMine: m.fromId === userId,
      unread: unreadBy.get(partner.id) ?? 0,
    });
  }
  const totalUnread = [...unreadBy.values()].reduce((a, b) => a + b, 0);
  return { chats, totalUnread };
}

export async function getThread(db: PrismaClient, userId: string, otherUsername: string) {
  const other = await db.user.findUnique({
    where: { username: otherUsername },
    select: { id: true, username: true },
  });
  if (!other) throw notFound('Usuário não encontrado');
  if (other.id === userId) throw badRequest('Você não pode conversar consigo mesmo');

  const messages = await db.chatMessage.findMany({
    where: {
      OR: [
        { fromId: userId, toId: other.id },
        { fromId: other.id, toId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  // abrir a conversa marca as recebidas como lidas
  await db.chatMessage.updateMany({
    where: { fromId: other.id, toId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    with: other.username,
    messages: messages.map((m) => ({
      id: m.id,
      mine: m.fromId === userId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function sendMessage(
  db: PrismaClient,
  userId: string,
  otherUsername: string,
  body: string,
) {
  const text = body.trim();
  if (!text) throw badRequest('Mensagem vazia');
  if (text.length > MAX_BODY) throw badRequest(`Mensagem longa demais (máx. ${MAX_BODY})`);
  const other = await db.user.findUnique({
    where: { username: otherUsername },
    select: { id: true },
  });
  if (!other) throw notFound('Usuário não encontrado');
  if (other.id === userId) throw badRequest('Você não pode conversar consigo mesmo');

  const m = await db.chatMessage.create({
    data: { fromId: userId, toId: other.id, body: text },
  });
  return { id: m.id, mine: true, body: m.body, createdAt: m.createdAt.toISOString() };
}
