'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchActivity } from '@/lib/api-client';
import { brl, dateTime } from '@/lib/format';
import { TIER_META } from '@/lib/tiers';
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
              className="h-9 w-9 shrink-0"
              style={{ background: `${TIER_META[s.template.tier].color}33`, boxShadow: `inset 0 0 0 1px ${TIER_META[s.template.tier].color}55` }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-ink">
                {s.template.player.name} <span className="text-muted">#{s.serial}</span>
                {s.flagged && <span className="ml-2 text-[10px] text-accent">preço anômalo</span>}
              </div>
              <div className="truncate text-xs text-muted">
                {s.template.title}
                {s.buyer && ` · comprou @${s.buyer}`}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="tabular-nums text-sm text-accent3">{brl(s.priceCents)}</div>
              <div className="text-[10px] text-muted">{dateTime(s.createdAt).split(' ')[1] ?? ''}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
