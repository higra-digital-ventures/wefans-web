import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { env } from './env';
import { HttpError } from './lib/errors';
import { apiV1 } from './routes/api/v1';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'development' ? 'info' : 'warn' },
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });
  app.register(cookie);
  // Hardening (Fase 12): headers de segurança + rate limit por usuário/IP (seção A1).
  app.register(helmet, { contentSecurityPolicy: false }); // API JSON — CSP fica no frontend
  app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.userId ?? req.ip, // por usuário quando autenticado
  });

  // Envelope de erro consistente (seção A1).
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof HttpError) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION', message: 'Dados inválidos', details: error.flatten() } });
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(error);
    const code = status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'INTERNAL' : 'ERROR';
    const message =
      status === 429
        ? 'Muitas requisições — tente novamente em instantes'
        : status >= 500
          ? 'Erro interno'
          : error instanceof Error
            ? error.message
            : 'Erro';
    return reply.status(status).send({ error: { code, message } });
  });

  app.get('/', async () => ({
    name: 'wefans-api',
    docs: '/api/v1/health',
    version: 'v1',
  }));

  app.register(apiV1, { prefix: '/api/v1' });

  return app;
}
