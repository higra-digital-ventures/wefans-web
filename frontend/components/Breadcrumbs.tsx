import Link from 'next/link';

// Trilha em chips (padrão da página do Momento / Top Shot) — dá contexto e
// caminho de volta em páginas profundas (pacote, drop, desafio, edição).
export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5">
      {items.map((c) =>
        c.href ? (
          <Link
            key={c.label}
            href={c.href}
            className="bg-panel2 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white"
          >
            {c.label}
          </Link>
        ) : (
          <span key={c.label} className="bg-panel2 px-2.5 py-1 text-[11px] font-semibold text-neutral-400">
            {c.label}
          </span>
        ),
      )}
    </div>
  );
}
