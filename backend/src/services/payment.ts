import { randomBytes } from 'node:crypto';

// Adaptador de pagamento (seção 1). v1 = FakeWallet (simulado); depois plugar Stripe.
// Sempre centavos (Int). Nunca float.

export interface DepositInput {
  userId: string;
  amountCents: number;
  memo?: string;
}

export interface DepositResult {
  ok: true;
  providerRef: string;
}

export interface PaymentProvider {
  processDeposit(input: DepositInput): Promise<DepositResult>;
}

export class FakeWallet implements PaymentProvider {
  async processDeposit(_input: DepositInput): Promise<DepositResult> {
    // Simula uma captura externa bem-sucedida.
    return { ok: true, providerRef: `fake_${randomBytes(8).toString('hex')}` };
  }
}

export const paymentProvider: PaymentProvider = new FakeWallet();
