'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchFeed } from '@/lib/api-client';

// Aviso de "N novos eventos" no topo do feed: sonda a API a cada 15s e, ao clicar,
// re-renderiza a página no servidor (router.refresh) — o feed continua SSR.
export default function FeedPoller({ latestId }: { latestId: string | null }) {
  const [fresh, setFresh] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setFresh(0); // um refresh trouxe um novo latestId — zera o contador
    if (!latestId) return;
    const timer = setInterval(async () => {
      try {
        const { events } = await fetchFeed(20);
        const idx = events.findIndex((e) => e.id === latestId);
        setFresh(idx === -1 ? events.length : idx);
      } catch {
        // silencioso: erro de rede não derruba o feed
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [latestId]);

  if (fresh === 0) return null;
  return (
    <button
      role="status"
      aria-live="polite"
      onClick={() => router.refresh()}
      className="sticky top-16 z-10 w-full border border-accent3/50 bg-[#0c1416] py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-accent3 transition-colors hover:bg-accent3/10"
    >
      ↑ {fresh} novo{fresh > 1 ? 's' : ''} evento{fresh > 1 ? 's' : ''}
    </button>
  );
}
