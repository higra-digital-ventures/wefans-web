import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, verifySessionToken } from './tokens';
import { unauthorized } from './errors';
import { env } from '../env';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

/**
 * Resolvedor único de identidade (seção A1): aceita **Bearer** (app) OU **cookie**
 * de sessão (web) e devolve o `userId`. Os serviços recebem só o `userId` — não
 * sabem qual cliente chamou.
 */
export function resolveUserId(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const uid = verifyAccessToken(header.slice(7).trim());
    if (uid) return uid;
  }
  const cookie = req.cookies?.[env.COOKIE_NAME];
  if (cookie) {
    const uid = verifySessionToken(cookie);
    if (uid) return uid;
  }
  return undefined;
}

/** preHandler: exige autenticação; popula req.userId ou responde 401. */
export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  const uid = resolveUserId(req);
  if (!uid) throw unauthorized();
  req.userId = uid;
}

/** preHandler: autenticação opcional; popula req.userId se houver. */
export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply) {
  req.userId = resolveUserId(req);
}
