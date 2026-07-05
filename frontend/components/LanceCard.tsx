import Icon from './Icon';
import Link from 'next/link';
import CardWishlist from './CardWishlist';
import TacticalBoard from './TacticalBoard';
import { TIER_META, isFoil } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { TemplateDTO } from '@/lib/types';

// Carta de mercado copiada da anatomia do Top Shot (print de referência): card preto,
// slab 3D na mídia, linha "Tier /N (LE)", NOME em caps, descrição, Destruídos/Em circulação,
// set, e rodapé em duas linhas — Menor preço (branco, bold) e Média (cinza).
export default function LanceCard({
  template,
  serial,
  href,
  live,
  priceCents,
  listingPriceCents,
  paidCents,
  className = '',
  wishlist,
}: {
  template: TemplateDTO;
  serial?: number;
  href?: string;
  live?: boolean;
  priceCents?: number; // Menor preço (mercado)
  listingPriceCents?: number | null; // badge "À venda" (coleção)
  paidCents?: number; // contexto de dono: rodapé vira "Média · Pago" com cor de lucro
  className?: string;
  /** estado da wishlist do usuário (undefined = marcador decorativo) */
  wishlist?: { wished: boolean; canWish: boolean };
}) {
  const meta = TIER_META[template.tier];
  const foil = isFoil(template.tier);
  const burnedCount = template.mintedCount - template.circulatingCount;
  const limited = template.editionType === 'LIMITADA';
  const supply = limited
    ? `/${template.editionSize?.toLocaleString('pt-BR')}`
    : template.circulatingCount.toLocaleString('pt-BR');

  const inner = (
    <div
      className={`group relative overflow-hidden  border border-white/[0.06] bg-[#050505] transition-colors duration-150 hover:border-white/20 ${className}`}
    >
      {/* marcador (wishlist) — clicável quando a página fornece o estado */}
      {wishlist ? (
        <CardWishlist templateId={template.id} initial={wishlist.wished} canWish={wishlist.canWish} />
      ) : (
        <span className="absolute right-3 top-3 z-10 text-neutral-400 transition-colors group-hover:text-white" aria-hidden>
          <Icon name="bookmark" size={20} />
        </span>
      )}

      {/* mídia em perspectiva (slab 3D); no hover desvira e preenche o card
          enquanto o lance "toca" (glitch + bola na trajetória) — Top Shot */}
      <div className="px-5 pb-2 pt-7" style={{ perspective: '650px' }}>
        <div
          className="relative mx-auto w-[78%] transition-transform duration-300 ease-out group-hover:[transform:rotateY(0deg)_rotateX(0deg)_scale(1.2)]"
          style={{ transform: 'rotateY(-14deg) rotateX(3deg)', transformStyle: 'preserve-3d' }}
        >
          <div
            className={`relative aspect-[4/5] overflow-hidden border ${foil ? 'wf-foil' : ''}`}
            style={{
              borderColor: `${meta.color}66`,
              boxShadow: foil
                ? `12px 10px 26px rgba(0,0,0,.6), 0 0 18px ${meta.color}40`
                : '12px 10px 26px rgba(0,0,0,.6)',
            }}
          >
            <TacticalBoard
              trajectory={template.trajectory}
              jersey={template.player.jersey}
              color={meta.color}
              foil={foil}
              live={live}
              hoverPlay={!live}
            />
            {/* glitch/scanlines na entrada do hover */}
            <div aria-hidden className="wf-glitch pointer-events-none absolute inset-0" />
            {/* chip de play (some enquanto o lance toca) */}
            {!live && listingPriceCents == null && (
              <span
                aria-hidden
                className="absolute left-1.5 top-1.5  bg-black/50 px-1 py-0.5 tabular-nums text-[8px] text-white/80 transition-opacity duration-150 group-hover:opacity-0"
              >
                ▶
              </span>
            )}
            {serial !== undefined && (
              <span className="absolute bottom-1.5 left-1.5  bg-black/60 px-1 py-0.5 tabular-nums text-[9px] text-white">
                #{serial}
              </span>
            )}
            {listingPriceCents != null && (
              <span className="absolute left-1.5 top-1.5 bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                À venda · {brl(listingPriceCents)}
              </span>
            )}
            {priceCents != null && (
              <span className="absolute inset-x-2 bottom-2 translate-y-2 bg-accent py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                Ver e comprar · {brl(priceCents)}
              </span>
            )}
            {priceCents == null && paidCents != null && (
              <span className="absolute inset-x-2 bottom-2 translate-y-2 bg-white py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-black opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                Ver · Vender
              </span>
            )}
          </div>
          {/* face lateral falsa (profundidade) — some quando o slab desvira */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-[10px] origin-right  transition-opacity duration-200 group-hover:opacity-0"
            style={{
              transform: 'rotateY(64deg) translateX(10px)',
              background: `linear-gradient(180deg, ${meta.color}55, #0a0a0a)`,
            }}
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-4">
        {/* Tier /N (LE) — como "Common /4000 (LE)" */}
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="font-bold text-white">{meta.label}</span>
          <span
            className="font-semibold text-neutral-400"
            title={
              limited
                ? `Edição limitada: só ${template.editionSize?.toLocaleString('pt-BR')} exemplares existirão`
                : 'Edição circulante: novos exemplares ainda podem ser criados'
            }
          >
            {limited ? supply : `Aberta · ${supply}`}
          </span>
          {limited && (
            <span
              className="rounded-full border border-white/30 px-1.5 py-px text-[9px] font-bold leading-tight text-neutral-300"
              title="Limited Edition — tiragem fixa, nunca aumenta"
            >
              LE
            </span>
          )}
          {template.parallel !== 'BASE' && (
            <span className="bg-white/10 px-1.5 py-px text-[9px] font-semibold uppercase text-neutral-300">
              {template.parallel}
            </span>
          )}
          <span
            className="ml-auto h-4 w-4 rounded-full"
            style={{ background: `radial-gradient(circle at 35% 35%, ${meta.color}, #111 85%)` }}
            aria-hidden
          />
        </div>

        <div className="mt-1.5 font-display text-[22px] uppercase leading-[1.04] text-white">
          {template.player.name}
        </div>
        <div className="mt-2 line-clamp-2 text-[12px] leading-snug text-neutral-400">
          {template.title}
        </div>

        {/* como o "Burned · Supply" do Top Shot: destruídos e o que restou circulando */}
        <div
          className="mt-2.5 truncate text-[11px] font-semibold text-neutral-200"
          title="Burned: exemplares queimados para sempre (bate-troca/fichas). Supply: exemplares que ainda existem."
        >
          Burned: {burnedCount.toLocaleString('pt-BR')} · Supply:{' '}
          {template.circulatingCount.toLocaleString('pt-BR')}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-neutral-500">
          {template.competition} · {template.playType} (Temporada 2025-26)
        </div>

        {/* rodapé contextual: mercado (Menor preço/Média) · dono (Média/Pago) · catálogo (Média) */}
        <div className="mt-3.5 space-y-1 border-t border-white/10 pt-2.5">
          {priceCents != null && (
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-neutral-300" title="O anúncio mais barato desta edição à venda agora">
                Menor preço
              </span>
              <span className="text-[15px] font-bold text-white">{brl(priceCents)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-neutral-500" title="Preço médio das últimas vendas desta edição">
              Média ⓘ
            </span>
            <span className={`font-semibold ${paidCents != null ? 'text-[15px] font-bold text-white' : 'text-[12px] text-neutral-400'}`}>
              {template.aspCents > 0 ? brl(template.aspCents) : '—'}
            </span>
          </div>
          {paidCents != null && (
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-neutral-500" title="Quanto você pagou neste exemplar">
                Pago
              </span>
              <span
                className={`text-[12px] font-bold tabular-nums ${
                  template.aspCents > 0
                    ? template.aspCents >= paidCents
                      ? 'text-emerald-400'
                      : 'text-red-400'
                    : 'text-neutral-400'
                }`}
                title={template.aspCents > 0 ? (template.aspCents >= paidCents ? 'a média está acima do que você pagou' : 'a média está abaixo do que você pagou') : undefined}
              >
                {brl(paidCents)}
              </span>
            </div>
          )}
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
