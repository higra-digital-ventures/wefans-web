'use client';

import { useRef } from 'react';
import TacticalBoard from './TacticalBoard';

// Mídia do Lance com dados reais: foto do jogador como base, a trajetória da
// jogada correndo por cima (identidade do produto) e, quando a edição tem clipe,
// o vídeo entra no hover. Sem foto, cai na prancheta tática de sempre.
export default function CardMedia({
  photoUrl,
  videoUrl,
  trajectory,
  jersey,
  color,
  foil,
  live,
  hoverPlay,
  alt,
}: {
  photoUrl?: string | null;
  videoUrl?: string | null;
  trajectory: string | null;
  jersey: number;
  color: string;
  foil?: boolean;
  live?: boolean;
  hoverPlay?: boolean;
  alt?: string;
}) {
  const vref = useRef<HTMLVideoElement>(null);

  if (!photoUrl) {
    return (
      <TacticalBoard trajectory={trajectory} jersey={jersey} color={color} foil={foil} live={live} hoverPlay={hoverPlay} />
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => vref.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const v = vref.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- asset local em /public */}
      <img src={photoUrl} alt={alt ?? ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top" />
      {/* sombra de leitura + aura do tier */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(5,5,5,.12) 0%, transparent 28%, rgba(5,5,5,.55) 74%, rgba(5,5,5,.82) 100%), radial-gradient(90% 55% at 50% 0%, ${color}26, transparent 65%)`,
        }}
      />
      {/* a jogada corre por cima da foto */}
      <div className="absolute inset-0">
        <TacticalBoard bare trajectory={trajectory} jersey={jersey} color={color} foil={foil} live={live} hoverPlay={hoverPlay} />
      </div>
      {/* clipe de teste (CC): entra no hover do card */}
      {videoUrl && (
        <video
          ref={vref}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
      {/* gaiola de LED: padrão de TODO NFT com vídeo — cantoneiras na cor do tier */}
      {videoUrl && <MediaCage color={color} />}
    </div>
  );
}

// cantoneiras de LED em CSS (versão plana da gaiola do cubo) — cor pelo tier
function MediaCage({ color }: { color: string }) {
  const arm = 'pointer-events-none absolute z-10 h-4 w-4';
  const style = { borderColor: color, filter: `drop-shadow(0 0 2px ${color}) drop-shadow(0 0 5px ${color})` };
  return (
    <>
      <span aria-hidden className={`${arm} left-1 top-1 rounded-tl border-l-2 border-t-2`} style={style} />
      <span aria-hidden className={`${arm} right-1 top-1 rounded-tr border-r-2 border-t-2`} style={style} />
      <span aria-hidden className={`${arm} bottom-1 left-1 rounded-bl border-b-2 border-l-2`} style={style} />
      <span aria-hidden className={`${arm} bottom-1 right-1 rounded-br border-b-2 border-r-2`} style={style} />
    </>
  );
}
