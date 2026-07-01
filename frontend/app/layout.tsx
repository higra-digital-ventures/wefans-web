import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Anton, Outfit, Space_Mono } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';
import SiteFooter from '@/components/SiteFooter';

// Fontes da marca (seção 11.1): Anton (display) · Outfit (texto) · Space Mono (série).
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-text' });
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'wefans — Momentos de Futebol',
  description:
    'Colecione Lances numerados de futebol. Mesma gramática do NBA Top Shot, conteúdo 100% fictício.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${outfit.variable} ${spaceMono.variable}`}>
      <body>
        <Suspense fallback={<div className="h-14 border-b border-line" />}>
          <TopBar />
        </Suspense>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
