'use client';

import { useEffect } from 'react';

// Persiste a escolha de visualização do mercado (grade/densa/lista) num cookie
// para o SSR já renderizar no modo preferido na próxima visita.
export default function VisCookie({ vis }: { vis?: string }) {
  useEffect(() => {
    if (vis) document.cookie = `wf-vis=${vis}; path=/; max-age=31536000; samesite=lax`;
  }, [vis]);
  return null;
}
