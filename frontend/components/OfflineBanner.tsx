'use client';

import { useEffect, useState } from 'react';

// Faixa global de conexão: aparece quando o navegador fica offline e
// confirma quando volta (some sozinha).
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const down = () => {
      setOffline(true);
      setWasOffline(true);
    };
    const up = () => {
      setOffline(false);
      setTimeout(() => setWasOffline(false), 3000);
    };
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => {
      window.removeEventListener('offline', down);
      window.removeEventListener('online', up);
    };
  }, []);

  if (!offline && !wasOffline) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[110] py-1.5 text-center text-[12px] font-bold uppercase tracking-[0.1em] ${
        offline ? 'bg-amber-400 text-black' : 'bg-emerald-500 text-black'
      }`}
    >
      {offline ? 'Sem conexão — mostrando a última versão carregada' : 'Conexão de volta ✓'}
    </div>
  );
}
