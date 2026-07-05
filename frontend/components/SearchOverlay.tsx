'use client';

import Icon from './Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchTemplates } from '@/lib/api-client';
import TacticalBoard from './TacticalBoard';
import { TIER_META, isFoil } from '@/lib/tiers';
import type { TemplateDTO } from '@/lib/types';

// Busca global no padrão do Top Shot: a lupa da top bar abre um overlay full-width
// com input centrado, "Categorias populares" à esquerda e "Moments populares" ao centro.
export default function SearchOverlay({
  popular,
  categories,
}: {
  popular: TemplateDTO[];
  categories: { label: string; q: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [catalog, setCatalog] = useState<TemplateDTO[] | null>(null); // p/ autocomplete
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // atalho global "/" abre a busca (ignora quando o foco já está num campo)
  useEffect(() => {
    const onSlash = (e: KeyboardEvent) => {
      if (e.key !== '/' || open) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', onSlash);
    return () => document.removeEventListener('keydown', onSlash);
  }, [open]);

  // carrega o catálogo uma vez, na primeira abertura (autocomplete ao digitar)
  useEffect(() => {
    if (!open || catalog) return;
    fetchTemplates()
      .then((r) => setCatalog(r.templates))
      .catch(() => setCatalog([]));
  }, [open, catalog]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !catalog) return [];
    return catalog
      .filter(
        (t) =>
          t.player.name.toLowerCase().includes(needle) ||
          t.player.club.toLowerCase().includes(needle) ||
          t.title.toLowerCase().includes(needle),
      )
      .slice(0, 6);
  }, [q, catalog]);

  const [recents, setRecents] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    try {
      setRecents(JSON.parse(localStorage.getItem('wf-recent-searches') ?? '[]'));
    } catch {
      setRecents([]);
    }
  }, [open]);

  const go = (query: string) => {
    if (query) {
      const next = [query, ...recents.filter((r) => r !== query)].slice(0, 6);
      setRecents(next);
      try {
        localStorage.setItem('wf-recent-searches', JSON.stringify(next));
      } catch {
        /* storage cheio/bloqueado */
      }
    }
    setOpen(false);
    router.push(`/mercado${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <>
      <button
        aria-label="Buscar (atalho: /)"
        title="Buscar (atalho: /)"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel2 hover:text-ink"
      >
        <Icon name="search" size={22} />
      </button>

      {open &&
        mounted &&
        createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Busca">
          {/* backdrop escurece o resto da página */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div className="relative border-b border-white/10 bg-[#050505]">
            {/* faixa do input, centrada como no Top Shot */}
            <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
              <form
                className="relative mx-auto w-full max-w-4xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  go(q.trim());
                }}
              >
                <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Busque por jogadores, times e tiers."
                  className="h-10 w-full border border-white/50 bg-black pl-10 pr-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white"
                />
              </form>
              <button
                aria-label="Fechar busca"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* resultados ao digitar */}
            {q.trim() && (
              <div className="mx-auto max-w-4xl px-4 pb-6 pt-1 lg:px-6">
                {matches.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-neutral-500">
                    Nada com “{q}” — Enter busca no mercado.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/[0.06]">
                    {matches.map((t) => {
                      const meta = TIER_META[t.tier];
                      return (
                        <li key={t.id}>
                          <Link
                            href={`/lance/${t.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-white/5"
                          >
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-white">
                                {t.player.name} <span className="font-normal text-neutral-500">· {t.player.club}</span>
                              </span>
                              <span className="block truncate text-[11px] text-neutral-400">
                                {meta.label} · {t.title}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] text-neutral-500">ver edição →</span>
                          </Link>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        onClick={() => go(q.trim())}
                        className="w-full px-2 py-2.5 text-left text-[12px] font-semibold text-accent3 hover:bg-white/5"
                      >
                        Buscar “{q.trim()}” no mercado →
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}

            {/* painel: categorias + moments populares */}
            {!q.trim() && (
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-8 pt-2 md:flex-row lg:px-6">
              <div className="w-full shrink-0 md:w-[260px]">
                {recents.length > 0 && (
                  <div className="mb-5">
                    <div className="mb-2 text-[13px] font-bold text-white">Buscas recentes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {recents.map((r) => (
                        <button
                          key={r}
                          onClick={() => go(r)}
                          className="border border-white/15 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-white/10 hover:text-white"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-3 text-[13px] font-bold text-white">Categorias populares</div>
                <div className="space-y-2">
                  {categories.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => go(c.q)}
                      className="flex w-full items-center gap-2.5 border border-white/10 bg-[#141416] px-3 py-2 text-left text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sunset text-[10px] font-bold uppercase text-white">
                        {c.label[0]}
                      </span>
                      {c.label}
                    </button>
                  ))}
                  <Link
                    href="/jogar/rankings"
                    onClick={() => setOpen(false)}
                    className="mt-4 flex w-full items-center gap-2.5 border border-white/10 bg-[#141416] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Icon name="market" size={16} className="text-neutral-300" />
                    Fichas &amp; Rankings
                  </Link>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-baseline justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                    <Icon name="drops" size={16} className="text-neutral-300" />
                    Moments populares
                  </div>
                  <Link
                    href="/mercado"
                    onClick={() => setOpen(false)}
                    className="text-[12px] font-semibold text-white underline underline-offset-2 hover:text-neutral-300"
                  >
                    Marketplace
                  </Link>
                </div>
                <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
                  {popular.map((t) => {
                    const meta = TIER_META[t.tier];
                    return (
                      <Link
                        key={t.id}
                        href={`/lance/${t.id}`}
                        onClick={() => setOpen(false)}
                        className="w-[150px] shrink-0 border border-white/10 bg-[#0a0a0b] p-2.5 transition-colors hover:border-white/30"
                      >
                        <div className="relative mx-auto w-[80%]" style={{ perspective: '500px' }}>
                          <div
                            className="aspect-[4/5] overflow-hidden border"
                            style={{
                              transform: 'rotateY(-12deg) rotateX(2deg)',
                              borderColor: `${meta.color}66`,
                              boxShadow: `8px 7px 18px rgba(0,0,0,.6)${isFoil(t.tier) ? `, 0 0 14px ${meta.color}40` : ''}`,
                            }}
                          >
                            <TacticalBoard
                              trajectory={t.trajectory}
                              jersey={t.player.jersey}
                              color={meta.color}
                              foil={isFoil(t.tier)}
                            />
                          </div>
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-black px-2 py-px text-[8px] font-bold text-neutral-300">
                            {t.editionType === 'LIMITADA' ? `Limitada /${t.editionSize}` : `Aberta · ${t.circulatingCount}`}
                          </span>
                        </div>
                        <div className="mt-4 text-[13px] font-bold leading-tight text-white">
                          {t.player.name}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-400">
                          {meta.label}: {t.playType} - {t.title} (Temporada 25/26)
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
