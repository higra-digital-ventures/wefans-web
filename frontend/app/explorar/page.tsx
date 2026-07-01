import { getTemplatesServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import TierChips from '@/components/TierChips';

export const dynamic = 'force-dynamic';

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const templates = await getTemplatesServer(tier ? `?tier=${tier}` : '');

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Explorar o catálogo</h1>
      <p className="mb-6 text-muted">{templates.length} Lances publicados · Temporada 1</p>

      <TierChips basePath="/explorar" active={tier} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {templates.map((t) => (
          <LanceCard key={t.id} template={t} href={`/lance/${t.id}`} />
        ))}
      </div>
    </main>
  );
}
