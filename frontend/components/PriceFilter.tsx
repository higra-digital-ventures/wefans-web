'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Faixa de preço do mercado com auto-aplicação: digitou, filtrou (debounce 600ms).
// Sem botão OK — padrão de filtro moderno.
export default function PriceFilter({ pmin, pmax }: { pmin?: string; pmax?: string }) {
  const router = useRouter();
  const [min, setMin] = useState(pmin ?? '');
  const [max, setMax] = useState(pmax ?? '');
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (min) params.set('pmin', min);
      else params.delete('pmin');
      if (max) params.set('pmax', max);
      else params.delete('pmax');
      params.delete('n'); // volta à primeira página
      router.push(`/mercado?${params.toString()}`, { scroll: false });
    }, 600);
    return () => clearTimeout(t);
  }, [min, max, router]);

  const input =
    'w-14 bg-transparent py-2 text-sm tabular-nums text-white outline-none placeholder:text-neutral-500';

  return (
    <div className="flex items-center gap-1.5 border border-white/60 px-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">R$</span>
      <input
        inputMode="numeric"
        aria-label="Preço mínimo em reais"
        placeholder="mín"
        value={min}
        onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
        className={input}
      />
      <span className="text-neutral-500">–</span>
      <input
        inputMode="numeric"
        aria-label="Preço máximo em reais"
        placeholder="máx"
        value={max}
        onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
        className={input}
      />
    </div>
  );
}
