'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createShowcase } from '@/lib/api-client';

export default function CreateShowcaseForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');

  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da nova vitrine"
        className="flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-ink outline-none placeholder:text-muted/60"
      />
      <button
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50"
        disabled={!name.trim() || pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await createShowcase({ name: name.trim() });
              router.push(`/vitrine/${r.showcase.id}`);
            } catch (e) {
              if (e instanceof Error && /autenticad|401/i.test(e.message)) router.push('/entrar');
            }
          })
        }
      >
        Criar
      </button>
    </div>
  );
}
