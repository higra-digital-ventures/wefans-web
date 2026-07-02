import Link from 'next/link';
import TacticalBoard from './TacticalBoard';
import { TIER_META, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { TemplateDTO } from '@/lib/types';

// Carta de mercado no padrão do Top Shot (seção 11.12e): mídia em leve perspectiva 3D
// com marcador de wishlist, linha "Tier · /N", NOME do jogador, descrição do lance,
// "Queimados · Tiragem", set/competição e o rodapé Menor preço / Média.
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
  priceCents?: number; // Menor preço (mercado)
  listingPriceCents?: number | null; // badge "À venda" (coleção)
  className?: string;
}) {
  const meta = TIER_META[template.tier];
  const foil = isFoil(template.tier);
  const burnedCount = template.mintedCount - template.circulatingCount;
  const supply =
    template.editionType === 'LIMITADA'
      ? `/${template.editionSize?.toLocaleString('pt-BR')}`
      : `CC · ${template.circulatingCount.toLocaleString('pt-BR')}`;

  const inner = (
    <div
      className={`group relative overflow-hidden rounded-lg border border-line bg-[#0c0813] transition-colors duration-150 hover:border-[#3a2b52] ${className}`}
    >
      {/* marcador (wishlist) */}
      <span className="absolute right-2.5 top-2.5 z-10 text-muted/70 transition-colors group-hover:text-ink" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.2L5 22V3a1 1 0 0 1 1-1Zm1 2v14.5l5-3 5 3V4H7Z" />
        </svg>
      </span>

      {/* mídia em perspectiva (slab 3D) */}
      <div className="px-6 pb-3 pt-6" style={{ perspective: '650px' }}>
        <div
          className="relative mx-auto w-[82%] transition-transform duration-200 group-hover:[transform:rotateY(-8deg)_rotateX(2deg)]"
          style={{ transform: 'rotateY(-14deg) rotateX(3deg)', transformStyle: 'preserve-3d' }}
        >
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[3px] border"
            style={{
              borderColor: `${meta.color}88`,
              boxShadow: foil
                ? `12px 10px 26px rgba(0,0,0,.55), 0 0 18px ${meta.color}40`
                : '12px 10px 26px rgba(0,0,0,.55)',
            }}
          >
            <TacticalBoard
              trajectory={template.trajectory}
              jersey={template.player.jersey}
              color={meta.color}
              foil={foil}
              live={live}
            />
            {serial !== undefined && (
              <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-black/60 px-1 py-0.5 font-mono text-[9px] text-ink">
                #{serial}
              </span>
            )}
          </div>
          {/* face lateral falsa (profundidade) */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-[10px] origin-right rounded-r-[3px]"
            style={{
              transform: 'rotateY(64deg) translateX(10px)',
              background: `linear-gradient(180deg, ${meta.color}55, #120a1c)`,
            }}
          />
        </div>
      </div>

      <div className="px-3.5 pb-3.5">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-muted">{supply}</span>
          {template.parallel !== 'BASE' && (
            <span className="rounded-sm bg-panel2 px-1 py-px text-[9px] font-semibold uppercase text-muted">
              {template.parallel}
            </span>
          )}
          {listingPriceCents != null && (
            <span className="ml-auto rounded-sm bg-emerald-500/15 px-1.5 py-px text-[9px] font-bold uppercase text-emerald-300">
              À venda
            </span>
          )}
        </div>

        <div className="mt-1.5 font-display text-[17px] uppercase leading-[1.05] text-ink">
          {template.player.name}
        </div>
        <div className="mt-1 truncate text-[11px] text-muted">{template.title}</div>

        <div className="mt-2 text-[10px] text-muted">
          Queimados: {burnedCount.toLocaleString('pt-BR')} · Cunhados:{' '}
          {template.mintedCount.toLocaleString('pt-BR')}
        </div>
        <div className="truncate text-[10px] text-muted/80">
          {template.playType} · {template.competition} (Temporada 25/26)
        </div>

        <div className="mt-2.5 flex items-end justify-between border-t border-line pt-2">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-muted">Menor preço</div>
            <div className="text-[13px] font-bold text-ink">
              {priceCents != null ? brl(priceCents) : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-muted">Média</div>
            <div className="font-mono text-[11px] text-muted">
              {template.aspCents > 0 ? brl(template.aspCents) : '—'}
            </div>
          </div>
        </div>
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
