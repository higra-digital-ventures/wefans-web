import Link from 'next/link';
import { getMe, getMyPacksServer, getPackMarketServer } from '@/lib/api-server';
import PackMarketClient from '@/components/PackMarketClient';

export const dynamic = 'force-dynamic';

export default async function PacotesMercadoPage() {
  const [listings, myPacks, me] = await Promise.all([
    getPackMarketServer(),
    getMyPacksServer(),
    getMe(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-4xl uppercase text-ink">Mercado de Pacotes</h1>
        <Link href="/mercado" className="text-sm text-accent3 hover:underline">
          mercado de Lances →
        </Link>
      </div>
      <p className="mb-8 text-muted">Compre e venda pacotes lacrados (não abertos).</p>
      <PackMarketClient listings={listings} myPacks={myPacks} isAuthed={!!me} />
    </main>
  );
}
