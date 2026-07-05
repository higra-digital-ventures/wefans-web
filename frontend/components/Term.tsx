import Link from 'next/link';
import type { ReactNode } from 'react';

// Glossário inline: termo técnico com sublinhado pontilhado que leva
// à seção certa do guia /como-funciona. Não usar dentro de outro <Link>.
export default function Term({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link
      href={`/como-funciona#${id}`}
      title="O que é isso? Toque para ver no guia"
      className="underline decoration-dotted decoration-white/40 underline-offset-2 transition-colors hover:decoration-white"
    >
      {children}
    </Link>
  );
}
