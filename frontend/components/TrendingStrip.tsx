import Link from 'next/link';
import Icon from './Icon';
import TacticalBoard from './TacticalBoard';
import { TIER_META, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { TemplateDTO } from '@/lib/types';

// Carrossel "Em alta": edições mais negociadas nas últimas 24h, com posição no
// ranking e seta de tendência (vs as 24h anteriores). Usado no feed e no mercado.
export default function TrendingStrip({
  items,
}: {
  items: { template: TemplateDTO; count: number; dir?: 'up' | 'down' | null }[];
}) {
  if (items.length < 2) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
        <Icon name="flame" filled size={14} />
        Em alta · 24h
      </div>
      <div className="scrollbar-none -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {items.map(({ template: t, count, dir }, i) => {
          const meta = TIER_META[t.tier];
          return (
            <Link
              key={t.id}
              href={`/moment/${t.id}`}
              className="rounded-2xl relative w-[118px] shrink-0 border border-white/10 bg-[#08080a] p-2 transition-colors hover:border-white/30"
            >
              {/* posição no ranking — mini-tabela de cotação, não só vitrine */}
              <span className="absolute left-0 top-0 z-10 bg-white px-1.5 py-0.5 tabular-nums text-[10px] font-bold text-black">
                {i + 1}
              </span>
              <div className="mx-auto w-[86%]">
                <div className="aspect-[4/5] overflow-hidden rounded-lg border" style={{ borderColor: `${meta.color}66` }}>
                  <TacticalBoard
                    trajectory={t.trajectory}
                    jersey={t.player.jersey}
                    color={meta.color}
                    foil={isFoil(t.tier)}
                  />
                </div>
              </div>
              <div className="mt-1.5 truncate text-[11px] font-bold text-white">{t.player.name}</div>
              <div className="flex items-baseline justify-between text-[10px]">
                <span
                  className={`tabular-nums font-semibold ${
                    dir === 'up' ? 'text-emerald-400' : dir === 'down' ? 'text-red-400' : 'text-neutral-500'
                  }`}
                  title={
                    dir === 'up'
                      ? 'mais negócios que nas 24h anteriores'
                      : dir === 'down'
                        ? 'menos negócios que nas 24h anteriores'
                        : `${count} negócios em 24h`
                  }
                >
                  {dir === 'up' ? '↑ ' : dir === 'down' ? '↓ ' : ''}
                  {count} neg.
                </span>
                <span className="tabular-nums font-semibold text-neutral-200">
                  {t.aspCents > 0 ? brl(t.aspCents) : ''}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
