import Link from 'next/link';

// Sub-abas em caixa alta com sublinhado no ativo (padrão das telas do Top Shot).
export default function SubTabs({
  items,
}: {
  items: { label: string; href: string; active?: boolean }[];
}) {
  return (
    <div className="scrollbar-none -mx-1 mb-6 flex gap-3 overflow-x-auto">
      {items.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`relative whitespace-nowrap px-3 pb-3 pt-1 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors ${
            t.active ? 'text-white' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t.label}
          {t.active && <span className="absolute inset-x-3 bottom-1.5 h-[2px] bg-white" />}
        </Link>
      ))}
    </div>
  );
}
