'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type Moment3DType from './Moment3D';

// Three.js pesa ~600KB — carrega só quando a página do Momento monta, sem SSR,
// com um placeholder no formato do slab enquanto baixa.
const Moment3D = dynamic(() => import('./Moment3D'), {
  ssr: false,
  loading: () => (
    // skeleton no formato real do palco: proporção 4:5 + fileira de botões de face
    <div aria-hidden>
      <div className="relative mx-auto aspect-[4/5] w-full">
        <div className="absolute inset-[8%] animate-pulse rounded-2xl bg-panel" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-9 animate-pulse rounded-lg bg-panel" />
        ))}
      </div>
    </div>
  ),
});

export default function Moment3DLazy(props: ComponentProps<typeof Moment3DType>) {
  return <Moment3D {...props} />;
}
