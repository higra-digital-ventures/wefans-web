import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Sofia_Sans_Extra_Condensed, Roboto_Flex, Roboto_Mono } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';
import SiteFooter from '@/components/SiteFooter';
import Toaster from '@/components/Toaster';
import BottomNav from '@/components/BottomNav';
import NextTopLoader from 'nextjs-toploader';

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
      <body className="pb-14 lg:pb-0" suppressHydrationWarning>
        {/* barra de progresso no topo durante as navegações (padrão Top Shot) */}
        <NextTopLoader color="#21d4e0" height={3} showSpinner={false} shadow="0 0 8px #21d4e0" />
        <Toaster>
          <Suspense fallback={<div className="h-[72px] border-b border-line" />}>
            <TopBar />
          </Suspense>
          {children}
          <SiteFooter />
          <BottomNav />
        </Toaster>
      </body>
    </html>
  );
}
