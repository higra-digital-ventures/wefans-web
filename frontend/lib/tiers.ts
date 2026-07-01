import type { Tier } from './types';

// Cores dos tiers (seção 11.1). Ordem crescente de raridade.
export const TIER_META: Record<Tier, { label: string; color: string }> = {
  COMUM: { label: 'Comum', color: '#8b8194' },
  TORCIDA: { label: 'Torcida', color: '#21d4e0' },
  RARO: { label: 'Raro', color: '#9d4edd' },
  LENDARIO: { label: 'Lendário', color: '#ff9e2c' },
  GALACTICO: { label: 'Galáctico', color: '#ff2e88' },
};

export const TIER_ORDER: Tier[] = ['GALACTICO', 'LENDARIO', 'RARO', 'TORCIDA', 'COMUM'];

export const isFoil = (t: Tier) => t === 'LENDARIO' || t === 'GALACTICO';

export function editionLabel(
  t: { editionType: string; editionSize: number | null; circulatingCount: number },
  serial?: number,
): string {
  if (t.editionType === 'LIMITADA') {
    return serial ? `#${serial}/${t.editionSize}` : `Limitada · /${t.editionSize}`;
  }
  return `Circulante · ${t.circulatingCount.toLocaleString('pt-BR')}`;
}
