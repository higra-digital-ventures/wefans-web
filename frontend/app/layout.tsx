import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Sofia_Sans_Extra_Condensed, Roboto_Flex, Roboto_Mono } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';
import VisitorBanner from '@/components/VisitorBanner';
import SiteFooter from '@/components/SiteFooter';
import OfflineBanner from '@/components/OfflineBanner';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'wefans — Momentos de Futebol', template: '%s — wefans' },
  description:
    'Colecione Momentos numerados do futebol brasileiro. Projeto em desenvolvimento — sem afiliação oficial com clubes, ligas ou atletas.',
  openGraph: {
    siteName: 'wefans',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sofia.variable} ${robotoFlex.variable} ${robotoMono.variable}`}>
      <body className="pb-14 lg:pb-0" suppressHydrationWarning>
        {/* barra de progresso no topo durante as navegações (padrão Top Shot) */}
        <NextTopLoader color="#21d4e0" height={3} showSpinner={false} shadow="0 0 8px #21d4e0" />
        <OfflineBanner />
        <Toaster>
          <Suspense fallback={<div className="h-[72px] border-b border-line" />}>
            <TopBar />
          </Suspense>
          <Suspense fallback={null}>
            <VisitorBanner />
          </Suspense>
          {children}
          <SiteFooter />
          <BottomNav />
        </Toaster>
      </body>
    </html>
  );
}
