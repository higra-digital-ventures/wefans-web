import Link from 'next/link';
import BuyPackButton from './BuyPackButton';
import { TIER_META } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { PackDTO, Tier } from '@/lib/types';

export default function PackCard({ pack }: { pack: PackDTO }) {
  const remaining = pack.totalSupply - pack.soldCount;
  const soldOut = remaining <= 0;

  return (
    <div className="border border-line bg-panel p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Link href={`/pacote/${pack.id}`} className="font-display text-xl text-ink hover:text-accent">
            {pack.name}
          </Link>
          <p className="text-xs text-muted">{pack.momentCount} Lances por pacote</p>
        </div>
        <span className="shrink-0 rounded-full bg-panel2 px-2.5 py-1 tabular-nums text-sm text-accent3">
          {brl(pack.priceCents)}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {Object.entries(pack.oddsJson).map(([tier, p]) => {
          const meta = TIER_META[tier as Tier];
          return (
            <span
              key={tier}
              className="px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {meta.label} {(p * 100).toFixed(p * 100 < 1 ? 1 : 0)}%
            </span>
          );
        })}
      </div>

      <p className="mb-3 text-xs text-muted">
        {soldOut
          ? 'Esgotado'
          : `${remaining.toLocaleString('pt-BR')} de ${pack.totalSupply.toLocaleString('pt-BR')} disponíveis`}
        {pack.guaranteeTier && ` · garante ${TIER_META[pack.guaranteeTier].label}+`}
      </p>

      <div className="flex items-center gap-2">
        <BuyPackButton packId={pack.id} priceCents={pack.priceCents} soldOut={soldOut} />
        <Link
          href={`/pacote/${pack.id}`}
          className="border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink"
        >
          Ver Lances
        </Link>
      </div>
    </div>
  );
}
