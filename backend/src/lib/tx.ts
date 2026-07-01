import { Prisma } from '@prisma/client';

// Erros transitórios de concorrência no Postgres: deadlock (40P01), falha de
// serialização (40001) e timeouts de transação do Prisma (P2028/P2034). São
// esperados sob contenção — a transação faz rollback e pode ser refeita com segurança.
const RETRYABLE = new Set(['40P01', '40001', 'P2028', 'P2034']);

function isRetryable(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (RETRYABLE.has(e.code)) return true;
    const metaCode = (e.meta as { code?: string } | undefined)?.code;
    if (metaCode && RETRYABLE.has(metaCode)) return true;
  }
  const msg = String((e as { message?: string })?.message ?? '');
  return /deadlock detected|could not serialize/i.test(msg);
}

/**
 * Executa `fn` (tipicamente um `prisma.$transaction`) com retentativas em erros
 * transitórios de concorrência. Cada tentativa é uma transação nova e atômica.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isRetryable(e) || i === attempts - 1) throw e;
      lastErr = e;
      const delay = 15 * (i + 1) + Math.floor(Math.random() * 25); // backoff com jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
