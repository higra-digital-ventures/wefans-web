'use client';

import { useToast } from '@/components/Toaster';

// Compartilhar (Web Share API com fallback para copiar o link) — canto da página
// do Momento, como no Top Shot.
export default function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copiado!', 'success');
      }
    } catch {
      /* usuário cancelou o share sheet */
    }
  }
  return (
    <button
      onClick={share}
      aria-label="Compartilhar"
      title="Compartilhar"
      className="flex h-9 w-9 items-center justify-center border border-white/15 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M18 16a3 3 0 0 0-2.4 1.2l-7-3.5a3 3 0 0 0 0-1.4l7-3.5a3 3 0 1 0-.9-1.8l-7 3.5a3 3 0 1 0 0 5l7 3.5A3 3 0 1 0 18 16Z" />
      </svg>
    </button>
  );
}
