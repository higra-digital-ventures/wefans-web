'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addWishlist, removeWishlist } from '@/lib/api-client';
import Icon from '@/components/Icon';
import { useToast } from '@/components/Toaster';

// Marcador de wishlist DENTRO do card (clicável direto da grade, como no Top Shot).
// Otimista; vive dentro de um <Link>, então bloqueia a navegação ao clicar.
export default function CardWishlist({
  templateId,
  initial,
  canWish,
}: {
  templateId: string;
  initial: boolean;
  canWish: boolean;
}) {
  const [wished, setWished] = useState(initial);
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      aria-label={wished ? 'Remover da wishlist' : 'Adicionar à wishlist'}
      title={wished ? 'Na sua wishlist' : 'Adicionar à wishlist'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canWish) {
          router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        const next = !wished;
        setWished(next);
        (next ? addWishlist(templateId) : removeWishlist(templateId)).catch(() => {
          setWished(!next);
          toast('Não deu para atualizar a wishlist — tente de novo.', 'error');
        });
      }}
      className={`absolute right-3 top-3 z-10 transition-colors ${
        wished ? 'text-accent' : 'text-neutral-400 hover:text-white'
      }`}
    >
      <Icon name="bookmark" filled={wished} size={20} />
    </button>
  );
}
