'use client';

import { useEffect, useState } from 'react';

// Contagem regressiva viva ("2h 14min 05s") — atualiza a cada segundo.
// prefix/suffix opcionais; quando zera, mostra o rótulo de encerrado e para.
function fmt(ms: number) {
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}min`;
  if (h > 0) return `${h}h ${m}min ${String(ss).padStart(2, '0')}s`;
  return `${m}min ${String(ss).padStart(2, '0')}s`;
}

export default function Countdown({
  until,
  endedLabel = 'encerrado',
  className = '',
}: {
  until: string;
  endedLabel?: string;
  className?: string;
}) {
  const target = new Date(until).getTime();
  const [left, setLeft] = useState<string | null>(() => fmt(target - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(fmt(target - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span
      className={className}
      title={new Date(until).toLocaleString('pt-BR')}
      aria-label={left ? `termina ${new Date(until).toLocaleString('pt-BR')}` : endedLabel}
    >
      <span aria-hidden>{left ?? endedLabel}</span>
    </span>
  );
}
