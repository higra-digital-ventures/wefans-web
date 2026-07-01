import type { PrismaClient, Prisma } from '@prisma/client';

/**
 * Contexto passado à camada de serviço. Os serviços são agnósticos de transporte:
 * não conhecem Request/Response, cookies nem React (seção A1). Recebem só `db` e,
 * quando autenticado, `userId`. `db` pode ser o PrismaClient ou um cliente de
 * transação (`$transaction`), permitindo compor operações atômicas.
 */
export interface ServiceContext {
  db: PrismaClient | Prisma.TransactionClient;
  userId?: string;
}
