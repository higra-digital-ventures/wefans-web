import type { Prisma } from '@prisma/client';

// Fase 13 (opcional) — abstração de propriedade (seção 12): a v1 é 100% em banco
// (DbOwnership). Para levar mint/transfer/burn a uma blockchain (Flow ou L2 EVM),
// implemente OwnershipProvider com as chamadas on-chain e troque o provider — os
// serviços de negócio (mint, market, moment, tickets…) não mudam, pois toda mutação
// de posse já converge nos três verbos abaixo dentro de $transaction.

export interface OwnershipProvider {
  /** Registra a cunhagem do serial para o dono. On-chain: mint do NFT. */
  onMint(tx: Prisma.TransactionClient, momentId: string, ownerId: string): Promise<void>;
  /** Registra a transferência de posse. On-chain: transfer do NFT. */
  onTransfer(tx: Prisma.TransactionClient, momentId: string, fromId: string | null, toId: string): Promise<void>;
  /** Registra a queima. On-chain: burn do NFT. */
  onBurn(tx: Prisma.TransactionClient, momentId: string, fromId: string): Promise<void>;
}

/** v1: a posse vive nas linhas de `Moment` (as mutações já acontecem nos serviços);
 * este provider é o ponto de acoplamento para side-effects (eventos, espelho on-chain). */
export class DbOwnership implements OwnershipProvider {
  async onMint(): Promise<void> {
    /* posse = Moment.ownerId (já gravado pelo serviço chamador) */
  }
  async onTransfer(): Promise<void> {
    /* idem — Transaction registra a procedência */
  }
  async onBurn(): Promise<void> {
    /* idem — burned=true + circulatingCount */
  }
}

export const ownershipProvider: OwnershipProvider = new DbOwnership();

/** Saque para wallet não-custodial (item 31): stub — habilita quando houver chain. */
export function withdrawStub() {
  return {
    status: 'INDISPONIVEL' as const,
    message:
      'Saque on-chain ainda não está habilitado nesta versão. Quando a integração com a blockchain for ativada (OwnershipProvider), seus Momentos poderão ser retirados para uma wallet não-custodial.',
  };
}
