import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Sofia_Sans_Extra_Condensed, Roboto_Flex, Roboto_Mono } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';
import SiteFooter from '@/components/SiteFooter';
import Toaster from '@/components/Toaster';

// Fontes: as mesmas famílias abertas (OFL/Google Fonts) que o Top Shot usa —
// Sofia Sans Extra Condensed (display) · Roboto Flex (texto) · Roboto Mono (série).
// A "Owners" (wide, proprietária) não é usada. Ver DECISIONS.md.
const sofia = Sofia_Sans_Extra_Condensed({ subsets: ['latin'], variable: '--font-display' });
const robotoFlex = Roboto_Flex({ subsets: ['latin'], variable: '--font-text' });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'wefans — Momentos de Futebol',
  description:
    'Colecione Lances numerados de futebol. Mesma gramática do NBA Top Shot, conteúdo 100% fictício.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sofia.variable} ${robotoFlex.variable} ${robotoMono.variable}`}>
      <body>
        <Toaster>
          <Suspense fallback={<div className="h-14 border-b border-line" />}>
            <TopBar />
          </Suspense>
          {children}
          <SiteFooter />
        </Toaster>
      </body>
    </html>
  );
}
