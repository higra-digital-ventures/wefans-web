'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelOffer } from '@/lib/api-client';

export default function CancelOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await cancelOffer(offerId);
            router.refresh();
          } catch {
            /* ignora */
          }
        })
      }
      className="border border-line px-3 py-1 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
    >
      Cancelar
    </button>
  );
}
