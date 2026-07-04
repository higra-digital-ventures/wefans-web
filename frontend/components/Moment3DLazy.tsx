'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type Moment3DType from './Moment3D';

// Three.js pesa ~600KB — carrega só quando a página do Momento monta, sem SSR,
// com um placeholder no formato do slab enquanto baixa.
const Moment3D = dynamic(() => import('./Moment3D'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto aspect-square w-full max-w-[380px] animate-pulse bg-panel" aria-hidden />
  ),
});

export default function Moment3DLazy(props: ComponentProps<typeof Moment3DType>) {
  return <Moment3D {...props} />;
}
