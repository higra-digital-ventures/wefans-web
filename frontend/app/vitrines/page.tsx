import EmptyState from '@/components/EmptyState';
import Link from 'next/link';
import { getMyShowcasesServer, getPublicShowcasesServer } from '@/lib/api-server';
import CreateShowcaseForm from '@/components/CreateShowcaseForm';
import type { ShowcaseSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

function Card({ s }: { s: ShowcaseSummary }) {
  return (
    <Link href={`/vitrine/${s.id}`} className="rounded-2xl block  border border-line bg-panel p-5 transition-colors hover:border-accent/40">
      <h3 className="font-display text-xl text-ink">{s.name}</h3>
      <p className="text-sm text-muted">
        {s.itemCount} Lances{s.ownerUsername ? ` · @${s.ownerUsername}` : ''}
        {!s.public ? ' · privada' : ''}
      </p>
      {s.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{s.description}</p>}
    </Link>
  );
}

export default async function VitrinesPage() {
  const [publicShowcases, mine] = await Promise.all([getPublicShowcasesServer(), getMyShowcasesServer()]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Vitrines</h1>
      <p className="mb-8 text-muted">Álbuns curados dos seus Lances.</p>

      {mine !== null && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Minhas vitrines</h2>
          <div className="mb-4 max-w-md">
            <CreateShowcaseForm />
          </div>
          {mine.length === 0 ? (
            <EmptyState
              title="Sua primeira vitrine te espera"
              hint="Monte uma seleção dos seus melhores Lances e mostre para a galera."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((s) => (
                <Card key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Públicas</h2>
        {publicShowcases.length === 0 ? (
          <p className="text-muted">Nenhuma vitrine pública ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicShowcases.map((s) => (
              <Card key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
