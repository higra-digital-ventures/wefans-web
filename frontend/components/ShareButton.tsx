'use client';

import Icon from './Icon';
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
      <Icon name="share" size={16} />
    </button>
  );
}
