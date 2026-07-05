'use client';

import Icon from './Icon';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Dropdown de ordenação estilizado (o <select> nativo destoa do tema escuro).
export default function SortDropdown({
  options,
  current,
  param = 'sort',
}: {
  options: { v: string; label: string }[];
  current: string;
  param?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const active = options.find((o) => o.v === current) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-full min-h-[48px] items-center gap-2 border border-white/60 bg-black px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white hover:border-white"
      >
        {active.label}
        <Icon name="chevronDown" size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 w-48 border border-white/15 bg-[#0c0c0e] shadow-[0_16px_40px_rgba(0,0,0,.7)]"
        >
          {options.map((o) => (
            <li key={o.v}>
              <button
                role="option"
                aria-selected={o.v === current}
                onClick={() => {
                  setOpen(false);
                  const p = new URLSearchParams(window.location.search);
                  p.set(param, o.v);
                  router.push(`${window.location.pathname}?${p}`, { scroll: false });
                }}
                className={`w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  o.v === current ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
