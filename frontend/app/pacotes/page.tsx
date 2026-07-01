import { getPacksServer } from '@/lib/api-server';
import PackCard from '@/components/PackCard';

export const dynamic = 'force-dynamic';

export default async function PacotesPage() {
  const packs = await getPacksServer();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Pacotes</h1>
      <p className="mb-8 text-muted">Compre, abra e revele Lances numerados.</p>
      {packs.length === 0 ? (
        <p className="text-muted">Nenhum pacote disponível no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packs.map((p) => (
            <PackCard key={p.id} pack={p} />
          ))}
        </div>
      )}
    </main>
  );
}
