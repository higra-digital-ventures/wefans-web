'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navegação inferior fixa no mobile (padrão de app): os 5 destinos principais
// sempre a um toque, em vez de tudo escondido no hamburger.
const ITEMS = [
  {
    label: 'Mercado',
    href: '/mercado',
    d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Zm0 2h12l1.5 2h-15L6 4Zm-1 4h14v12H5V8Zm4 2v2a3 3 0 0 0 6 0v-2h-2v2a1 1 0 0 1-2 0v-2H9Z',
  },
  {
    label: 'Explorar',
    href: '/explorar',
    d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.2 5.8-2.4 6-6 2.4 2.4-6 6-2.4Z',
  },
  {
    label: 'Jogar',
    href: '/jogar',
    d: 'M7 6a5 5 0 0 0-5 5v4a3 3 0 0 0 5.4 1.8L9 15h6l1.6 1.8A3 3 0 0 0 22 15v-4a5 5 0 0 0-5-5H7Zm1 3h2v2h2v2h-2v2H8v-2H6v-2h2V9Z',
  },
  {
    label: 'Coleção',
    href: '/colecao',
    d: 'M4 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v14h10V5H4Zm14 1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-2v-2h2V8h-2V6Z',
  },
  {
    label: 'Perfil',
    href: '/perfil',
    d: 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 12c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z',
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/mercado'
      ? pathname.startsWith('/mercado') || pathname.startsWith('/momento') || pathname.startsWith('/lance')
      : pathname.startsWith(href);

  return (
    <nav
      aria-label="navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                active ? 'text-white' : 'text-neutral-500'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                <path d={it.d} />
              </svg>
              {it.label}
              {active && <span className="absolute top-0 h-[2px] w-8 bg-ink" aria-hidden />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
