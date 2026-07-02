import Link from 'next/link';

// Sub-abas em caixa alta com sublinhado no ativo (padrão das telas do Top Shot).
export default function SubTabs({
  items,
}: {
  items: { label: string; href: string; active?: boolean }[];
}) {
  return (
    <div className="scrollbar-none -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`relative whitespace-nowrap px-3 pb-2.5 pt-1 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors ${
            t.active ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
          {t.active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
        </Link>
      ))}
    </div>
  );
}
