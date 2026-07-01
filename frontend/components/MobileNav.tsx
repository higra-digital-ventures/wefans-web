import Link from 'next/link';

// Menu mobile (seção 11.11): a top bar vira um dropdown <details> abaixo de md.
export default function MobileNav({ items }: { items: { label: string; href: string }[] }) {
  return (
    <details className="relative md:hidden">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-line text-ink [&::-webkit-details-marker]:hidden"
        aria-label="Abrir menu"
      >
        ☰
      </summary>
      <nav className="absolute left-0 top-11 z-50 w-48 rounded-xl border border-line bg-panel p-2 shadow-neon">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-panel2 hover:text-ink"
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
