import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Auth (Fase 1)
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_SESSION_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'), // token de acesso do app
  SESSION_TOKEN_TTL: z.string().default('7d'), // cookie de sessão da web
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_NAME: z.string().default('wf_session'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
