'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api-client';

// Botão genérico de ação administrativa: POST → refresh, com confirmação opcional.
export default function AdminAction({
  path,
  body,
  label,
  confirmText,
  variant = 'ghost',
}: {
  path: string;
  body?: unknown;
  label: string;
  confirmText?: string;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cls =
    variant === 'primary'
      ? 'rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white'
      : variant === 'danger'
        ? 'rounded-lg border border-accent/50 px-3 py-1.5 text-xs text-accent'
        : 'rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-ink';

  return (
    <span className="inline-flex flex-col">
      <button
        disabled={pending}
        className={`${cls} disabled:opacity-50`}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          setError(null);
          start(async () => {
            try {
              await adminPost(path, body);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erro');
            }
          });
        }}
      >
        {pending ? '…' : label}
      </button>
      {error && <span className="mt-1 text-[10px] text-accent">{error}</span>}
    </span>
  );
}
