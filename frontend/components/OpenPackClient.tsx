'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { openPack } from '@/lib/api-client';
import LanceCard from './LanceCard';
import type { MomentDTO } from '@/lib/types';

export default function OpenPackClient({ inventoryId }: { inventoryId: string }) {
  const [moments, setMoments] = useState<MomentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open() {
    setError(null);
    start(async () => {
      try {
        const r = await openPack(inventoryId);
        setMoments(r.moments);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao abrir');
      }
    });
  }

  if (moments) {
    return (
      <div>
        <h1 className="mb-1 font-display text-4xl uppercase text-ink">
          Você revelou {moments.length} Lances!
        </h1>
        <p className="mb-8 text-muted">Adicionados à sua coleção.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {moments.map((m, i) => (
            <div key={m.id} className="wf-reveal" style={{ animationDelay: `${i * 160}ms` }}>
              <LanceCard template={m.template} serial={m.serial} href={`/momento/${m.id}`} live />
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <Link href="/colecao" className="bg-accent px-5 py-2.5 font-semibold text-white">
            Ver coleção
          </Link>
          <Link href="/pacotes" className="border border-line px-5 py-2.5 text-muted hover:text-ink">
            Abrir outro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="mb-6 h-52 w-40  bg-sunset shadow-neon" />
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Pacote lacrado</h1>
      <p className="mb-6 max-w-sm text-muted">
        Rasgue para revelar seus Lances. O que sair é seu — numerado e colecionável.
      </p>
      {error && (
        <div className="mb-4 max-w-sm  border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
          <div className="mt-2">
            <Link href="/colecao" className="underline">
              Ir para a coleção
            </Link>
          </div>
        </div>
      )}
      <button
        onClick={open}
        disabled={pending}
        className="bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Abrindo…' : 'Rasgar o pacote'}
      </button>
    </div>
  );
}
