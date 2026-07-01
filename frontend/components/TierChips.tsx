import Link from 'next/link';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';

// Filtro de tier via query param (server-side, sem JS). Reusado em coleção e explorar.
export default function TierChips({ basePath, active }: { basePath: string; active?: string }) {
  const base = 'rounded-full border px-3 py-1 text-sm transition-colors';
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Link
        href={basePath}
        className={`${base} ${active ? 'border-line text-muted hover:text-ink' : 'border-accent text-ink'}`}
      >
        Todos
      </Link>
      {TIER_ORDER.map((t) => {
        const on = active === t;
        return (
          <Link
            key={t}
            href={`${basePath}?tier=${t}`}
            className={base}
            style={
              on
                ? { borderColor: TIER_META[t].color, color: TIER_META[t].color }
                : { borderColor: 'var(--line)', color: 'var(--muted)' }
            }
          >
            {TIER_META[t].label}
          </Link>
        );
      })}
    </div>
  );
}
