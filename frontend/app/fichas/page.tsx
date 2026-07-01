import { redirect } from 'next/navigation';
import { getMe, getTicketPacksServer } from '@/lib/api-server';
import FichasClient from '@/components/FichasClient';

export const dynamic = 'force-dynamic';

export default async function FichasPage() {
  const me = await getMe();
  if (!me) redirect('/entrar');
  const packs = await getTicketPacksServer();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Fichas de Troca</h1>
      <p className="mb-8 text-muted">Troque Lances por fichas, e fichas por pacotes exclusivos.</p>
      <FichasClient packs={packs} tradeTickets={me.tradeTickets} />
    </main>
  );
}
