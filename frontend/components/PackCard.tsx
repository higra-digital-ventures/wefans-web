import Link from 'next/link';
import Icon from './Icon';
import BuyPackButton from './BuyPackButton';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { PackDTO, Tier } from '@/lib/types';

// odds sempre da mais comum à mais rara (leitura instantânea)
const RARITY_ASC = [...TIER_ORDER].reverse();
// "Raro ou melhor" = as 3 raridades no topo (TIER_ORDER é rara→comum)
const RARE_PLUS = new Set(TIER_ORDER.slice(0, 3));

export default function PackCard({ pack }: { pack: PackDTO }) {
  const remaining = pack.totalSupply - pack.soldCount;
  const soldOut = remaining <= 0;
  const free = pack.priceCents === 0;
  const soldPct = Math.round((pack.soldCount / Math.max(1, pack.totalSupply)) * 100);
  const lowStock = !soldOut && remaining / Math.max(1, pack.totalSupply) <= 0.1;

  // odds ordenadas + chance de Raro+
  const odds = RARITY_ASC.map((t) => [t, pack.oddsJson[t] ?? 0] as [Tier, number]).filter(([, p]) => p > 0);
  const rarePlus = Object.entries(pack.oddsJson).reduce(
    (s, [t, p]) => (RARE_PLUS.has(t as Tier) ? s + (p as number) : s),
    0,
  );

  // acento de cor: a garantia, senão a melhor raridade obtível
  const bestTier = pack.guaranteeTier ?? (TIER_ORDER.find((t) => (pack.oddsJson[t] ?? 0) > 0) as Tier | undefined);
  const accent = bestTier ? TIER_META[bestTier].color : '#8b8194';

  const fmtPct = (p: number) => (p * 100).toFixed(p * 100 < 1 ? 1 : 0);

  return (
    <Link
      href={`/pacote/${pack.id}`}
      className={`rounded-2xl group relative block overflow-hidden border border-line bg-panel p-5 transition-colors ${
        soldOut ? 'opacity-60' : 'hover:border-white/25'
      }`}
    >
      {/* acento de cor por tier no topo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 80%)` }}
      />
      {soldOut && (
        <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-300">
          Esgotado
        </span>
      )}

      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-xl text-ink transition-colors group-hover:text-accent">{pack.name}</div>
          <p className="text-xs text-muted">
            {pack.momentCount} Momento{pack.momentCount > 1 ? 's' : ''} por pacote
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full bg-panel2 px-2.5 py-1 tabular-nums text-sm font-semibold ${
            free ? 'text-emerald-300' : 'text-accent3'
          }`}
        >
          {free ? 'Grátis' : brl(pack.priceCents)}
        </span>
      </div>

      {/* garantia como selo destacado */}
      {pack.guaranteeTier && (
        <div
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ borderColor: `${accent}66`, color: accent, background: `${accent}14` }}
        >
          <Icon name="lock" size={11} />
          Garante {TIER_META[pack.guaranteeTier].label}+
        </div>
      )}

      {/* odds: barra de proporção + chips ordenados + chance de Raro+ */}
      <div className="mb-4">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
          {odds.map(([t, p]) => (
            <span key={t} style={{ width: `${p * 100}%`, background: TIER_META[t].color }} title={`${TIER_META[t].label} ${fmtPct(p)}%`} />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
          {odds.map(([t, p]) => (
            <span key={t} className="text-[10px] font-medium" style={{ color: TIER_META[t].color }}>
              {TIER_META[t].label} {fmtPct(p)}%
            </span>
          ))}
        </div>
        {rarePlus > 0 && (
          <p className="mt-1.5 text-[11px] text-neutral-400">
            Chance de <span className="font-bold text-white">Raro ou melhor: {fmtPct(rarePlus)}%</span>
          </p>
        )}
      </div>

      {/* supply com barra de progresso + urgência */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className={soldOut ? 'text-neutral-500' : lowStock ? 'font-bold text-amber-300' : 'text-muted'}>
            {soldOut
              ? 'Esgotado'
              : lowStock
                ? `Últimas ${remaining.toLocaleString('pt-BR')} unidades!`
                : `${remaining.toLocaleString('pt-BR')} de ${pack.totalSupply.toLocaleString('pt-BR')} disponíveis`}
          </span>
          <span className="tabular-nums text-neutral-500">{soldPct}% vendido</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.max(2, soldPct)}%`, background: lowStock ? '#ff9e2c' : accent }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <BuyPackButton packId={pack.id} priceCents={pack.priceCents} soldOut={soldOut} />
        <span className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors group-hover:border-accent/40 group-hover:text-ink">
          Ver Momentos
        </span>
      </div>
    </Link>
  );
}
