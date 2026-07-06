'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';

type Opt = { label: string; href: string; active: boolean };

// Filtros do mercado no mobile: o rail esquerdo não existe < lg, então um botão
// "Filtros (n)" abre um painel deslizante de baixo com tudo dentro (padrão de app).
export default function MobileFilterSheet({
  groups,
  activeCount,
  clearHref,
}: {
  groups: { title: string; options: Opt[] }[];
  activeCount: number;
  clearHref: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 items-center gap-2 border border-white/60 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white lg:hidden"
      >
        <Icon name="sliders" size={14} />
        Filtros
        {activeCount > 0 && <span className="tabular-nums text-accent3">({activeCount})</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto border-t border-white/15 bg-[#0a0a0b] px-5 pb-8 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[14px] font-bold uppercase tracking-[0.12em] text-white">Filtros</span>
              <button
                aria-label="Fechar filtros"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-neutral-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            {groups.map((gr) => (
              <div key={gr.title} className="mb-5">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  {gr.title}
                </div>
                <div className="flex flex-wrap gap-2">
                  {gr.options.map((o) => (
                    <Link
                      key={o.label}
                      href={o.href}
                      scroll={false}
                      onClick={() => setOpen(false)}
                      className={`rounded-full border px-3.5 py-2 text-[12px] font-semibold ${
                        o.active
                          ? 'border-white bg-white text-black'
                          : 'border-white/25 text-neutral-300'
                      }`}
                    >
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {activeCount > 0 && (
              <Link
                href={clearHref}
                onClick={() => setOpen(false)}
                className="block border border-white/25 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-white"
              >
                Limpar filtros
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
