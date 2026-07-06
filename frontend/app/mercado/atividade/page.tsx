import { getActivityServer } from '@/lib/api-server';
import ActivityFeed from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

export default async function AtividadePage() {
  const initial = await getActivityServer(40);
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Vendas ao vivo</h1>
      <p className="mb-6 text-muted">O feed do Mercado — atualiza automaticamente.</p>
      <div className="rounded-2xl border border-line bg-panel p-3">
        <ActivityFeed initial={initial} limit={40} />
      </div>
    </main>
  );
}
