'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

// Navegação inferior fixa no mobile (padrão de app): os 5 destinos principais
// sempre a um toque. Ícones do set central: outline, preenchido quando ativo (padrão X).
const ITEMS: { label: string; href: string; icon: IconName }[] = [
  { label: 'Mercado', href: '/mercado', icon: 'market' },
  { label: 'Explorar', href: '/explorar', icon: 'explore' },
  { label: 'Jogar', href: '/jogar', icon: 'play' },
  { label: 'Coleção', href: '/colecao', icon: 'collection' },
  { label: 'Perfil', href: '/perfil', icon: 'user' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/mercado'
      ? pathname.startsWith('/mercado') || pathname.startsWith('/moment') || pathname.startsWith('/edicao') || pathname.startsWith('/lance')
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
              <Icon name={it.icon} filled={active} size={20} />
              {it.label}
              {active && <span className="absolute top-0 h-[2px] w-8 bg-ink" aria-hidden />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
