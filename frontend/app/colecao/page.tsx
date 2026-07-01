import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCollectionServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import TierChips from '@/components/TierChips';

export const dynamic = 'force-dynamic';

export default async function ColecaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const moments = await getCollectionServer(tier ? `?tier=${tier}` : '');
  if (moments === null) redirect('/entrar');

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Minha Coleção</h1>
      <p className="mb-6 text-muted">{moments.length} Lances</p>

      <TierChips basePath="/colecao" active={tier} />

      {moments.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center">
          <p className="mb-4 text-muted">Você ainda não tem Lances{tier ? ' deste tier' : ''}.</p>
          <Link href="/pacotes" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
            Abrir um pacote
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {moments.map((m) => (
            <LanceCard key={m.id} template={m.template} serial={m.serial} href={`/momento/${m.id}`} />
          ))}
        </div>
      )}
    </main>
  );
}
