import type { FastifyInstance, FastifyReply } from 'fastify';
import type { User } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../db';
import { env } from '../../../env';
import {
  authenticate,
  issueAppTokens,
  registerUser,
  revokeRefresh,
  rotateRefresh,
} from '../../../services/auth';
import { signSessionToken } from '../../../lib/tokens';
import { toUserDTO } from '../../../lib/dto';

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Use letras, números ou _'),
  password: z.string().min(8).max(72), // limite de bytes do bcrypt
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

function setSessionCookie(reply: FastifyReply, userId: string) {
  reply.setCookie(env.COOKIE_NAME, signSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });
}

// Web usa o cookie httpOnly; app usa os tokens do corpo. Ambos funcionam (seção A1).
async function buildAuthResponse(reply: FastifyReply, user: User) {
  const tokens = await issueAppTokens(prisma, user.id);
  setSessionCookie(reply, user.id);
  const favoriteTeam = user.favoriteTeamId
    ? await prisma.team.findUnique({ where: { id: user.favoriteTeamId } })
    : null;
  return { user: toUserDTO(user, favoriteTeam), ...tokens };
}

// Rate limit mais duro nas rotas de credencial (Fase 12 — anti brute-force).
const strictLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', strictLimit, async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(prisma, input);
    reply.status(201);
    return buildAuthResponse(reply, user);
  });

  app.post('/auth/login', strictLimit, async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authenticate(prisma, email, password);
    return buildAuthResponse(reply, user);
  });

  app.post('/auth/refresh', async (req) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await prisma.$transaction((tx) => rotateRefresh(tx, refreshToken));
    return { accessToken: result.accessToken, refreshToken: result.refreshToken };
  });

  app.post('/auth/logout', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) await revokeRefresh(prisma, parsed.data.refreshToken);
    reply.clearCookie(env.COOKIE_NAME, { path: '/' });
    return { ok: true };
  });
}
