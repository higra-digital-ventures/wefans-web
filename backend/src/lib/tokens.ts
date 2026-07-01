import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../env';

// Access token (app): JWT curto. Session token (web): JWT mais longo, vai no cookie httpOnly.
// Refresh token (app): token opaco aleatório, guardado com hash e rotacionado a cada uso.

type Ttl = jwt.SignOptions['expiresIn'];

export function signAccessToken(userId: string): string {
  return jwt.sign({ kind: 'access' }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL as Ttl,
  });
}

export function signSessionToken(userId: string): string {
  return jwt.sign({ kind: 'session' }, env.JWT_SESSION_SECRET, {
    subject: userId,
    expiresIn: env.SESSION_TOKEN_TTL as Ttl,
  });
}

function verify(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === 'object' && payload && typeof payload.sub === 'string') {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token: string) => verify(token, env.JWT_ACCESS_SECRET);
export const verifySessionToken = (token: string) => verify(token, env.JWT_SESSION_SECRET);

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString('hex');
  return { token, tokenHash: hashToken(token) };
}
