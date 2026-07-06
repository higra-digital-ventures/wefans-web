'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Paginação sem clique: quando o fim da grade se aproxima (600px antes),
// navega para a próxima página preservando o scroll. O botão fica de fallback.
export default function LoadMoreSentinel({ href }: { href: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const router = useRouter();

  useEffect(() => {
    fired.current = false; // href novo = próxima página liberada
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!fired.current && entries.some((e) => e.isIntersecting)) {
          fired.current = true;
          router.push(href, { scroll: false });
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [href, router]);

  return <div ref={ref} aria-hidden className="h-px" />;
}
