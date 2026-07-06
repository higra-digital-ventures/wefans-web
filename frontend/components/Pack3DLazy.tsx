'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type Pack3DType from './Pack3D';

// Three.js pesa ~600KB — carrega só na tela de abertura, sem SSR, com um
// placeholder no formato do pacote enquanto baixa.
const Pack3D = dynamic(() => import('./Pack3D'), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="mx-auto w-full max-w-[300px]">
      <div className="mx-auto aspect-[3/3.5] w-[64%] animate-pulse rounded-2xl bg-panel" />
    </div>
  ),
});

export default function Pack3DLazy(props: ComponentProps<typeof Pack3DType>) {
  return <Pack3D {...props} />;
}
