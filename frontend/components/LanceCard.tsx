import Link from 'next/link';
import TacticalBoard from './TacticalBoard';
import { TIER_META, editionLabel, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { TemplateDTO } from '@/lib/types';

// Carta do Lance (anatomia da seção 11.5/11.12), reusada em catálogo, coleção,
// detalhe do pacote e revelação. Versão 2D; o cubo 3D é da Fase 11.
export default function LanceCard({
  template,
  serial,
  href,
  live,
  priceCents,
  listingPriceCents,
  className = '',
}: {
  template: TemplateDTO;
  serial?: number;
  href?: string;
  live?: boolean;
  priceCents?: number; // preço de venda (mercado) — mostra pílula no rodapé
  listingPriceCents?: number | null; // "À venda" (coleção)
  className?: string;
}) {
  const meta = TIER_META[template.tier];
  const foil = isFoil(template.tier);

  const inner = (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-panel transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      style={{
        borderColor: `${meta.color}55`,
        boxShadow: foil ? `0 0 22px ${meta.color}33` : undefined,
      }}
    >
      <div className="relative aspect-[4/5]">
        <TacticalBoard
          trajectory={template.trajectory}
          jersey={template.player.jersey}
          color={meta.color}
          foil={foil}
          live={live}
        />
        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `${meta.color}26`, color: meta.color }}
        >
          {meta.label}
        </span>
        {template.parallel !== 'BASE' && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-ink">
            {template.parallel}
          </span>
        )}
        <span className="absolute bottom-2 left-2.5 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-ink">
          {editionLabel(template, serial)}
        </span>
        {listingPriceCents != null && (
          <span className="absolute bottom-2 right-2.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            À venda
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="truncate font-semibold text-ink">{template.player.name}</div>
        <div className="truncate text-xs text-muted">{template.title}</div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
          <span className="truncate">{template.player.club}</span>
          <span className="ml-2 shrink-0 font-mono">{template.competition}</span>
        </div>
        {priceCents != null && (
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wide text-muted">Menor preço</span>
            <span className="font-mono text-sm text-accent3">{brl(priceCents)}</span>
          </div>
        )}
        {priceCents == null && template.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {template.badges.map((b) => (
              <span key={b} className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] text-muted">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
