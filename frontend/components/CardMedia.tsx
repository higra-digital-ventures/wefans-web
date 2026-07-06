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
    </div>
  );
}
