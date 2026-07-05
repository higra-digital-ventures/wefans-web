'use client';

import { useEffect, useRef, useState } from 'react';
import { brl } from '@/lib/format';

// Número que anima até o valor quando muda (micro-interação do Top Shot).
export default function CountUp({ value, money = false }: { value: number; money?: boolean }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const start = performance.now();
    const dur = 600;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{money ? brl(shown) : shown.toLocaleString('pt-BR')}</>;
}
