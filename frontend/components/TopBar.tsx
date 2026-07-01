import Link from 'next/link';
import { getMe } from '@/lib/api-server';
import { brl } from '@/lib/format';

// Top bar global (seção 11.2). Itens de fases futuras ficam esmaecidos ("Em breve").
const NAV: { label: string; href?: string }[] = [
  { label: 'Explorar', href: '/explorar' },
  { label: 'Pacotes', href: '/pacotes' },
  { label: 'Mercado', href: '/mercado' },
  { label: 'Jogar' },
  { label: 'Coleção', href: '/colecao' },
];

export default async function TopBar() {
  const me = await getMe();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="bg-sunset bg-clip-text font-display text-2xl font-black uppercase tracking-tight text-transparent"
          >
            wefans
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className="cursor-default text-sm text-muted/50" title="Em breve">
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {me ? (
            <Link
              href="/perfil"
              className="flex items-center gap-3 rounded-full border border-line bg-panel px-4 py-1.5 transition-colors hover:border-accent/40"
            >
              <span className="font-mono text-sm text-accent3">{brl(me.balanceCents)}</span>
              <span className="text-sm text-ink">@{me.username}</span>
            </Link>
          ) : (
            <Link
              href="/entrar"
              className="rounded-full bg-accent px-5 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
