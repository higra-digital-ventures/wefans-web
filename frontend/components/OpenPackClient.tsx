'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { openPack } from '@/lib/api-client';
import MomentCard from './MomentCard';
import { brl } from '@/lib/format';
import { isFoil, TIER_META, TIER_ORDER } from '@/lib/tiers';
import type { MomentDTO } from '@/lib/types';

// Sequência de abertura (brief 11.7): rasgar → cartas materializam uma a uma →
// flash de refletor + confete em Lendário/Galáctico → resumo com valor estimado.
export default function OpenPackClient({
  inventoryId,
  auto = false,
}: {
  inventoryId: string;
  auto?: boolean; // veio da compra: rasga sozinho, sem parar na tela do lacrado
}) {
  const [moments, setMoments] = useState<MomentDTO[] | null>(null);
  const [tearing, setTearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const autoFired = useRef(false);

  const rare = useMemo(
    () => (moments ?? []).some((m) => isFoil(m.template.tier)),
    [moments],
  );
  const bestTier = useMemo(() => {
    const ms = moments ?? [];
    return ms.length
      ? [...ms].sort((a, b) => TIER_ORDER.indexOf(a.template.tier) - TIER_ORDER.indexOf(b.template.tier))[0]
          .template.tier
      : null;
  }, [moments]);
  const estimated = (moments ?? []).reduce((n, m) => n + (m.template.aspCents || 0), 0);

  function open() {
    setError(null);
    setTearing(true);
    start(async () => {
      try {
        const r = await openPack(inventoryId);
        // deixa a animação de rasgo respirar antes da revelação
        setTimeout(() => setMoments(r.moments), 450);
      } catch (e) {
        setTearing(false);
        setError(e instanceof Error ? e.message : 'Erro ao abrir');
      }
    });
  }

  // veio da compra com ?auto=1: rasga sozinho (uma vez)
  useEffect(() => {
    if (auto && !autoFired.current) {
      autoFired.current = true;
      open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (moments) {
    const meta = bestTier ? TIER_META[bestTier] : null;
    return (
      <div className="relative">
        {/* flash de refletor + confete quando vem Lendário/Galáctico */}
        {rare && meta && (
          <>
            <div
              aria-hidden
              className="wf-spotlight pointer-events-none fixed inset-0 z-10"
              style={{ background: `radial-gradient(60% 45% at 50% 30%, ${meta.color}33, transparent 70%)` }}
            />
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-10 h-0">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="wf-confetti absolute h-2 w-1.5"
                  style={{
                    left: `${4 + ((i * 37) % 92)}%`,
                    background: ['#ff2e88', '#21d4e0', '#9d4edd', '#ff9e2c', '#f7f7f8'][i % 5],
                    animationDelay: `${(i % 8) * 120}ms`,
                    animationDuration: `${2200 + (i % 5) * 300}ms`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        <h1 className="mb-1 font-display text-4xl uppercase text-ink">
          {rare && meta ? (
            <>
              Veio um <span style={{ color: meta.color }}>{meta.label}</span>!
            </>
          ) : (
            <>Você revelou {moments.length} Momentos!</>
          )}
        </h1>
        <p className="mb-8 text-muted">
          Adicionados à sua coleção
          {estimated > 0 && (
            <>
              {' '}· valor estimado do pack:{' '}
              <span className="font-semibold text-accent3">{brl(estimated)}</span>
            </>
          )}
          .
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {moments.map((m, i) => (
            <div key={m.id} className="wf-reveal" style={{ animationDelay: `${i * 420}ms` }}>
              <MomentCard template={m.template} serial={m.serial} href={`/momento/${m.id}`} live />
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <Link href="/colecao" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
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
      <div className={`mb-6 h-52 w-40 bg-sunset shadow-neon ${tearing ? 'wf-tear' : ''}`} />
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Pacote lacrado</h1>
      <p className="mb-6 max-w-sm text-muted">
        Rasgue para revelar seus Momentos. O que sair é seu — numerado e colecionável.
      </p>
      {error && (
        <div className="rounded-lg mb-4 max-w-sm border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
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
        disabled={pending || tearing}
        className="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending || tearing ? 'Rasgando…' : 'Rasgar o pacote'}
      </button>
    </div>
  );
}
