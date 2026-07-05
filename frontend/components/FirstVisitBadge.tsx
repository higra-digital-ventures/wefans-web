'use client';

import { useEffect, useRef, useState } from 'react';

// Chip "novo" que aparece até a primeira visita (orientação progressiva).
// Vive dentro de um <Link>: quando o card é clicado, marca como visto no localStorage.
export default function FirstVisitBadge({ id }: { id: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem('wf-seen-modes') ?? '[]');
      setShow(!seen.includes(id));
    } catch {
      setShow(true);
    }
  }, [id]);

  useEffect(() => {
    if (!show) return;
    const anchor = ref.current?.closest('a');
    if (!anchor) return;
    const mark = () => {
      try {
        const seen: string[] = JSON.parse(localStorage.getItem('wf-seen-modes') ?? '[]');
        if (!seen.includes(id)) localStorage.setItem('wf-seen-modes', JSON.stringify([...seen, id]));
      } catch {
        /* storage bloqueado — o chip volta na próxima, sem drama */
      }
    };
    anchor.addEventListener('click', mark);
    return () => anchor.removeEventListener('click', mark);
  }, [show, id]);

  if (!show) return null;
  return (
    <span
      ref={ref}
      className="bg-accent3 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-black"
    >
      novo
    </span>
  );
}
