'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addWishlist, removeWishlist } from '@/lib/api-client';

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
  const [wished, setWished] = useState(initialWished);
  const [pending, start] = useTransition();

  function toggle() {
    if (!canWish) {
      router.push('/entrar');
      return;
    }
    start(async () => {
      try {
        if (wished) {
          await removeWishlist(templateId);
          setWished(false);
        } else {
          await addWishlist(templateId);
          setWished(true);
        }
        router.refresh();
      } catch {
        /* ignora — mantém estado atual */
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-2  border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        wished ? 'border-accent text-accent' : 'border-line text-muted hover:text-ink'
      }`}
    >
      <span aria-hidden>{wished ? '★' : '☆'}</span>
      {wished ? 'Na wishlist' : 'Adicionar à wishlist'}
    </button>
  );
}
