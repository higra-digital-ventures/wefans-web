import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'wefans — Momentos de Futebol',
  description:
    'Colecione Lances numerados de futebol. Mesma gramática do NBA Top Shot, conteúdo 100% fictício.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
