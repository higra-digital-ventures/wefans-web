'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addWishlist, removeWishlist } from '@/lib/api-client';
import { useToast } from '@/components/Toaster';

export default function WishlistButton({
  templateId,
  canWish,
  initialWished,
}: {
  templateId: string;
  canWish: boolean;
  initialWished: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [wished, setWished] = useState(initialWished);
  const [, start] = useTransition();

  // otimista: o estado muda na hora; se a API falhar, reverte e avisa
  function toggle() {
    if (!canWish) {
      router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !wished;
    setWished(next);
    start(async () => {
      try {
        if (next) await addWishlist(templateId);
        else await removeWishlist(templateId);
        router.refresh();
      } catch {
        setWished(!next);
        toast('Não deu para atualizar a wishlist — tente de novo.', 'error');
      }
    });
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 border px-4 py-2.5 text-sm font-semibold transition-colors ${
        wished ? 'border-accent text-accent' : 'border-line text-muted hover:text-ink'
      }`}
    >
      <span aria-hidden>{wished ? '★' : '☆'}</span>
      {wished ? 'Na wishlist' : 'Adicionar à wishlist'}
    </button>
  );
}
