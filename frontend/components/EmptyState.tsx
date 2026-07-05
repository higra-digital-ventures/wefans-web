import Icon from './Icon';
import Link from 'next/link';

// Estado vazio padronizado: cluster de círculos da marca + título + dica + CTA.
export default function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center border border-white/10 bg-[#0a0a0b] px-6 py-12 text-center">
      <div className="mb-4 flex flex-col items-center gap-1.5" aria-hidden>
        <div className="flex gap-5">
          {['#21d4e0', '#9d4edd'].map((c) => (
            <span key={c} className="h-3.5 w-3.5 rounded-full" style={{ background: c, opacity: 0.9 }} />
          ))}
        </div>
        <div className="flex items-center gap-3.5">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: '#ff9e2c', opacity: 0.9 }} />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
            <Icon name="explore" filled size={14} className="text-white" />
          </span>
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: '#22c55e', opacity: 0.9 }} />
        </div>
      </div>
      <h3 className="font-display text-xl uppercase text-white">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-neutral-400">{hint}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 bg-accent px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
