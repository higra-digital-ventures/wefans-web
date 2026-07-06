import Link from 'next/link';
import Icon from './Icon';
import { brl } from '@/lib/format';
import type { Mover } from '@/lib/types';

// Movers 24h: as edições cujo preço médio mais subiu/caiu vs as 24h anteriores.
// A valorização só vira real quando é visível — este painel é o ticker.
export default function MoversPanel({ movers }: { movers: Mover[] }) {
  if (movers.length === 0) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
        <Icon name="trendUp" size={13} />
        Movers · 24h
      </div>
      <ol className="space-y-2">
        {movers.map((m) => (
          <li key={m.template.id}>
            <Link href={`/lance/${m.template.id}`} className="flex items-baseline justify-between gap-2 hover:text-white">
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-neutral-200">
                  {m.template.player.name}
                </span>
                <span className="block truncate text-[10px] text-neutral-500">{m.template.title}</span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={`block text-[13px] font-bold tabular-nums ${m.pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {m.pct >= 0 ? '↑ +' : '↓ '}
                  {m.pct}%
                </span>
                <span className="block text-[10px] tabular-nums text-neutral-500">{brl(m.avgCents)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
