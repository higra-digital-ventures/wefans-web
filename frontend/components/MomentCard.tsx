import Icon from './Icon';
import Link from 'next/link';
import CardWishlist from './CardWishlist';
import QuickBuy from './QuickBuy';
import CardMedia from './CardMedia';
import { TIER_META, isFoil, editionLabel } from '@/lib/tiers';
import { brl } from '@/lib/format';
import { clubCrestUrl } from '@/lib/media';
import type { TemplateDTO } from '@/lib/types';

// Carta de mercado copiada da anatomia do Top Shot (print de referência): card preto,
// slab 3D na mídia, linha "Tier /N (LE)", NOME em caps, descrição, Destruídos/Em circulação,
// set, e rodapé em duas linhas — Menor preço (branco, bold) e Média (cinza).
export default function MomentCard({
  template,
  serial,
  href,
  live,
  priceCents,
  listingPriceCents,
  paidCents,
  quickBuyListingId,
  hotLabel,
  challengeWanted,
  stillMedia,
  locked,
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
  quickBuyListingId?: string; // compra rápida no hover, sem sair da grade (logado)
  hotLabel?: string; // performance do dia ("2 gols hoje") — matchSim → mercado
  challengeWanted?: boolean; // exigido por desafio ativo — demanda de utilidade
  stillMedia?: boolean; // vitrine: imagem + gaiola, sem o clipe no hover
  locked?: boolean; // visitante deslogado: mídia sem vídeo, preço borrado, sem comprar
  className?: string;
  /** estado da wishlist do usuário (undefined = marcador decorativo) */
  wishlist?: { wished: boolean; canWish: boolean };
}) {
  const meta = TIER_META[template.tier];
  const foil = isFoil(template.tier);
  const limited = template.editionType === 'LIMITADA';
  // Δ do anúncio vs a média da edição (só quando relevante: ≥5%)
  const rawPct =
    priceCents != null && template.aspCents > 0
      ? Math.round(((priceCents - template.aspCents) / template.aspCents) * 100)
      : null;
  const marketPct = rawPct != null && Math.abs(rawPct) >= 5 ? rawPct : null;

  const inner = (
    <div
      className={`rounded-2xl group relative overflow-hidden  border border-white/[0.06] bg-[#050505] transition-colors duration-150 hover:border-white/20 ${className}`}
    >
      {/* ícones no topo-direito: wishlist + câmera (snapshot), como no Top Shot */}
      {wishlist ? (
        <CardWishlist templateId={template.id} initial={wishlist.wished} canWish={wishlist.canWish} />
      ) : (
        <span className="absolute right-3 top-3 z-10 text-neutral-400 transition-colors group-hover:text-white" aria-hidden>
          <Icon name="bookmark" size={20} />
        </span>
      )}
      <span
        aria-hidden
        className="absolute right-3 top-11 z-10 text-neutral-500 opacity-70 transition-opacity group-hover:opacity-100"
      >
        <Icon name="camera" size={20} />
      </span>

      {/* cabeçalho: NOME no topo (composição da referência do Top Shot) */}
      <div className="px-5 pr-14 pt-4">
        <h3 className="line-clamp-2 font-display text-[20px] uppercase leading-[1.05] tracking-tight text-white">
          {template.player.name}
        </h3>
      </div>

      {/* mídia em perspectiva (slab 3D); no hover desvira e preenche o card
          enquanto o lance "toca" (glitch + bola na trajetória) — Top Shot.
          pt maior: respiro entre o nome e a animação (folga do ícone de câmera) */}
      <div className="px-6 pb-2 pt-8" style={{ perspective: '650px' }}>
        <div className="wf-cube-bob relative mx-auto w-[78%]">
          {/* cantoneiras neon (viewfinder, como no Top Shot) — moldura fixa, o cubo gira dentro */}
          <span aria-hidden className="wf-corner -left-2.5 -top-2.5 rounded-tl border-l-2 border-t-2" />
          <span aria-hidden className="wf-corner -right-2.5 -top-2.5 rounded-tr border-r-2 border-t-2" />
          <span aria-hidden className="wf-corner -bottom-2.5 -left-2.5 rounded-bl border-b-2 border-l-2" />
          <span aria-hidden className="wf-corner -bottom-2.5 -right-2.5 rounded-br border-b-2 border-r-2" />
          <div className="wf-cube wf-cube-idle relative">
          <div
            className={`relative aspect-[4/5] overflow-hidden rounded-lg border ${foil ? 'wf-foil' : ''}`}
            style={{
              borderColor: `${meta.color}66`,
              boxShadow: foil
                ? `12px 10px 26px rgba(0,0,0,.6), 0 0 18px ${meta.color}40`
                : '12px 10px 26px rgba(0,0,0,.6)',
            }}
          >
            <CardMedia
              photoUrl={template.player.photoUrl}
              videoUrl={template.videoUrl}
              trajectory={template.trajectory}
              jersey={template.player.jersey}
              color={meta.color}
              foil={foil}
              live={live}
              hoverPlay={!live && !locked}
              stillOnly={stillMedia || locked}
              alt={template.player.name}
            />
            {locked && (
              <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-transparent to-transparent p-2">
                <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">
                  <Icon name="lock" size={9} /> vídeo 3D ao criar conta
                </span>
              </span>
            )}
            {/* glitch/scanlines na entrada do hover */}
            <div aria-hidden className="wf-glitch pointer-events-none absolute inset-0" />
            {/* chip de play (some enquanto o lance toca) */}
            {!live && listingPriceCents == null && !hotLabel && (
              <span
                aria-hidden
                className="absolute left-1.5 top-1.5 flex items-center bg-black/50 px-1 py-0.5 text-white/80 transition-opacity duration-150 group-hover:opacity-0"
              >
                <Icon name="play" size={10} />
              </span>
            )}
            {challengeWanted && (
              <span
                className="rounded-lg absolute right-1.5 top-1.5 flex items-center gap-0.5 bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                title="Exigido num desafio ativo — feche o álbum e leve o prêmio"
              >
                <Icon name="zap" size={9} />
                desafio
              </span>
            )}
            {listingPriceCents != null && (
              <span className="absolute left-1.5 top-1.5 bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                À venda · {brl(listingPriceCents)}
              </span>
            )}
            {hotLabel && listingPriceCents == null && (
              <span
                className="absolute left-1.5 top-1.5 flex items-center gap-1 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black"
                title="Performance de hoje no matchSim — jogador em evidência"
              >
                <Icon name="ball" size={10} />
                {hotLabel}
              </span>
            )}
          </div>
          {/* face lateral do cubo: arte do set (grid na cor do tier, camisa e jogada) */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-[44px] origin-right overflow-hidden rounded-r-lg border"
            style={{ transform: 'rotateY(90deg)', borderColor: `${meta.color}55`, background: '#0b0b0d' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `repeating-linear-gradient(0deg, ${meta.color}16 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, ${meta.color}16 0 1px, transparent 1px 9px)`,
              }}
            />
            <div className="relative flex h-full flex-col items-center justify-between py-2">
              <span className="font-display text-[15px] leading-none text-white/25">
                {template.player.jersey}
              </span>
              <span
                className="font-display text-[12px] uppercase tracking-[0.25em]"
                style={{ color: meta.color, writingMode: 'vertical-rl' }}
              >
                {template.playType}
              </span>
              <span className="text-[6px] font-bold uppercase tracking-[0.2em] text-white/30">2025</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-4 pt-6">
        {/* tier (cor da raridade) + serial/edição — "LEGENDARY  #/39" */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <span className="font-bold uppercase tracking-wide" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span
            className="tabular-nums text-neutral-400"
            title={
              limited
                ? `Edição limitada: só ${template.editionSize?.toLocaleString('pt-BR')} exemplares existirão`
                : template.emissionClosed
                  ? `Emissão encerrada: supply congelado em ${template.circulatingCount.toLocaleString('pt-BR')}`
                  : 'Edição circulante: novos exemplares ainda podem ser criados'
            }
          >
            {editionLabel(template, serial)}
          </span>
          {limited && (
            <span
              className="rounded-full border border-white/30 px-1.5 py-px text-[9px] font-bold leading-tight text-neutral-300"
              title="Limited Edition — quantidade fixa, nunca aumenta"
            >
              LE
            </span>
          )}
          {template.parallel !== 'BASE' && (
            <span className="bg-white/10 px-1.5 py-px text-[9px] font-semibold uppercase text-neutral-300">
              {template.parallel}
            </span>
          )}
        </div>

        {/* data | set (competição) */}
        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-neutral-400">
          <span className="tabular-nums">{new Date(template.matchDate).toLocaleDateString('pt-BR')}</span>
          <span className="text-neutral-700">|</span>
          <span className="truncate">{template.competition} 2025</span>
        </div>

        {/* título do lance (uma linha) */}
        <div className="mt-1 line-clamp-1 text-[12px] text-neutral-500">{template.title}</div>

        {/* rodapé: selo do tier + scrubber + escudo do clube (como na referência) */}
        <div className="mt-3 flex items-center gap-2.5">
          <span
            className="h-4 w-4 shrink-0 rounded-full"
            style={{ background: `radial-gradient(circle at 35% 35%, ${meta.color}, #111 85%)` }}
            aria-hidden
          />
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
          <img
            src={clubCrestUrl(template.player.club)}
            alt={template.player.club}
            className="h-7 w-7 shrink-0 object-contain opacity-90"
            loading="lazy"
          />
        </div>

      </div>

      {/* CTA de compra fixo na base + linha de preço embaixo (padrão Top Shot):
          seção própria, separada por hairline, ocupando a largura do card */}
      {locked ? (
        <div className="border-t border-white/10 p-3">
          <span className="rounded-lg flex items-center justify-center gap-1.5 bg-accent py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-white">
            <Icon name="lock" size={13} /> Entrar para ver
          </span>
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
            <span>
              Menor preço{' '}
              <span className="select-none blur-[5px]" aria-hidden>
                R$ 00,00
              </span>
            </span>
            <span>
              Média{' '}
              <span className="select-none blur-[5px]" aria-hidden>
                R$ 000
              </span>
            </span>
          </div>
        </div>
      ) : priceCents != null ? (
        <div className="border-t border-white/10 p-3">
          {quickBuyListingId ? (
            <QuickBuy bar listingId={quickBuyListingId} priceCents={priceCents} />
          ) : (
            <span className="rounded-lg block bg-accent py-2.5 text-center text-[13px] font-bold uppercase tracking-[0.06em] text-white">
              Comprar · {brl(priceCents)}
            </span>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400" title="O anúncio mais barato desta edição à venda agora">
              Menor preço <span className="font-bold text-white">{brl(priceCents)}</span>
              {marketPct != null && (
                <span className={`font-bold ${marketPct < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {' '}
                  {marketPct > 0 ? '+' : ''}
                  {marketPct}%
                </span>
              )}
            </span>
            <span className="text-neutral-500" title="Preço médio das últimas vendas desta edição">
              Média {template.aspCents > 0 ? brl(template.aspCents) : '—'}
            </span>
          </div>
        </div>
      ) : paidCents != null ? (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500" title="Quanto você pagou neste exemplar">
              Pago <span className="font-bold tabular-nums text-white">{brl(paidCents)}</span>
            </span>
            <span
              className={`font-bold tabular-nums ${
                template.aspCents > 0 ? (template.aspCents >= paidCents ? 'text-emerald-400' : 'text-red-400') : 'text-neutral-400'
              }`}
              title="Preço médio das últimas vendas desta edição"
            >
              Média {template.aspCents > 0 ? brl(template.aspCents) : '—'}
            </span>
          </div>
        </div>
      ) : null}
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
