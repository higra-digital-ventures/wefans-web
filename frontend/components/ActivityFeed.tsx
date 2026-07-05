'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchActivity } from '@/lib/api-client';
import { brl, timeAgo } from '@/lib/format';
import TacticalBoard from './TacticalBoard';
import { TIER_META, isFoil } from '@/lib/tiers';
import type { RecentSale } from '@/lib/types';

// Feed de vendas ao vivo (seção 11.3) — atualiza por polling a cada 10s.
export default function ActivityFeed({ initial, limit = 20 }: { initial: RecentSale[]; limit?: number }) {
  const [sales, setSales] = useState(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetchActivity(limit);
        if (alive) setSales(r.sales);
      } catch {
        /* ignora falhas de polling */
      }
    };
    const id = setInterval(tick, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [limit]);

  if (!sales.length) return <p className="text-sm text-muted">Nenhuma venda ainda.</p>;

  return (
    <ul className="divide-y divide-line">
      {sales.map((s) => (
        <li key={s.id}>
          <Link
            href={`/momento/${s.momentId}`}
            className="flex items-center gap-3  px-2 py-2.5 transition-colors hover:bg-panel2/60"
          >
            <span
              className="h-12 w-9 shrink-0 overflow-hidden border"
              style={{ borderColor: `${TIER_META[s.template.tier].color}66` }}
              aria-hidden
            >
              <TacticalBoard
                trajectory={s.template.trajectory}
                jersey={s.template.player.jersey}
                color={TIER_META[s.template.tier].color}
                foil={isFoil(s.template.tier)}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">
                {s.template.player.name}{' '}
                <span className="tabular-nums font-normal text-neutral-500">#{s.serial}</span>
                {s.flagged && <span className="ml-2 text-[10px] text-accent">preço anômalo</span>}
              </div>
              <div className="truncate text-[11px] text-neutral-400">
                <span style={{ color: TIER_META[s.template.tier].color }}>
                  {TIER_META[s.template.tier].label}
                </span>
                {' · '}
                {s.template.title}
                {s.buyer && ` · @${s.buyer}`}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[15px] font-bold tabular-nums text-white">{brl(s.priceCents)}</div>
              <div className="text-[10px] text-neutral-500">{timeAgo(s.createdAt)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
