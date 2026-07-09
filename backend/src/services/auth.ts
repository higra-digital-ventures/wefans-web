import bcrypt from 'bcryptjs';
import type { PrismaClient, Prisma, User } from '@prisma/client';
import { conflict, unauthorized } from '../lib/errors';
import { generateRefreshToken, hashToken, signAccessToken } from '../lib/tokens';
import { env } from '../env';

type Db = PrismaClient | Prisma.TransactionClient;

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export async function registerUser(db: Db, input: RegisterInput): Promise<User> {
  const existing = await db.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });
  if (existing) throw conflict('E-mail ou usuário já cadastrado');
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const user = await db.user.create({ data: { email: input.email, username: input.username, passwordHash } });
  await grantWelcomePack(db, user.id);
  return user;
}

/** Gancho de aquisição: todo novo colecionador ganha um pacote grátis lacrado
 * (o "pegue os primeiros grátis"). Concede um pack always-on gratuito; abre no
 * tour /bem-vindo ou na coleção. Sem pack grátis disponível, não faz nada. */
async function grantWelcomePack(db: Db, userId: string) {
  const pack = await db.pack.findFirst({
    where: { priceCents: 0, ticketOnly: false, dropId: null },
    orderBy: { totalSupply: 'desc' },
  });
  if (!pack) return;
  const reserved = await db.pack.updateMany({
    where: { id: pack.id, soldCount: { lt: pack.totalSupply } },
    data: { soldCount: { increment: 1 } },
  });
  if (reserved.count === 0) return;
  await db.packInventory.create({ data: { packId: pack.id, ownerId: userId } });
}

export async function authenticate(db: Db, email: string, password: string): Promise<User> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw unauthorized('Credenciais inválidas');
  }
  if (user.suspended) throw unauthorized('Conta suspensa — fale com o suporte');
  return user;
}

/** Emite par de tokens do app e persiste o refresh (hash) para rotação/revogação. */
export async function issueAppTokens(db: Db, userId: string) {
  const accessToken = signAccessToken(userId);
  const { token, tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await db.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return { accessToken, refreshToken: token };
}

/** Rotação: valida o refresh, revoga o atual e emite um novo par. Chamar dentro de $transaction. */
export async function rotateRefresh(db: Db, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const record = await db.refreshToken.findUnique({ where: { tokenHash } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw unauthorized('Refresh token inválido');
  }
  await db.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  const tokens = await issueAppTokens(db, record.userId);
  return { ...tokens, userId: record.userId };
}

export async function revokeRefresh(db: Db, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await db.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
