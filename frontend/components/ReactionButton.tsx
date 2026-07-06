'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reactFeed } from '@/lib/api-client';
import Icon from './Icon';

// 🔥 do feed: reação otimista, uma por usuário por evento (toggle).
export default function ReactionButton({
  eventKey,
  count: initialCount,
  reacted: initialReacted,
  authed,
}: {
  eventKey: string;
  count: number;
  reacted: boolean;
  authed: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);

  return (
    <button
      aria-label={reacted ? 'Remover reação' : 'Reagir com fogo'}
      title={reacted ? 'Você reagiu — toque para desfazer' : 'Que lance! 🔥'}
      onClick={() => {
        if (!authed) {
          router.push(`/entrar?next=${encodeURIComponent('/explorar')}`);
          return;
        }
        const next = !reacted;
        setReacted(next);
        setCount((c) => Math.max(0, c + (next ? 1 : -1)));
        reactFeed(eventKey)
          .then((r) => {
            setReacted(r.reacted);
            setCount(r.count);
          })
          .catch(() => {
            setReacted(!next);
            setCount((c) => Math.max(0, c + (next ? -1 : 1)));
          });
      }}
      className={`flex items-center gap-1.5 text-[12px] font-semibold tabular-nums transition-colors ${
        reacted ? 'text-accent2' : 'text-neutral-500 hover:text-accent2'
      }`}
    >
      <Icon name="flame" filled={reacted} size={16} />
      {count > 0 ? count : ''}
    </button>
  );
}
