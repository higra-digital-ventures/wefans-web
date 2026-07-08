import Link from 'next/link';
import { getPacksServer } from '@/lib/api-server';
import PackCard from '@/components/PackCard';

export const dynamic = 'force-dynamic';

export default async function PacotesPage() {
  const packs = await getPacksServer();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">Pacotes</h1>
      <p className="mb-4 text-muted">Compre, abra e revele Momentos numerados.</p>
      {/* as 3 superfícies de pacote num só lugar: loja (aqui), drops e revenda */}
      <div className="mb-8 flex flex-wrap gap-2 text-[13px]">
        <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white">Loja 24/7</span>
        <Link href="/drops" className="rounded-full border border-white/15 px-3 py-1 font-semibold text-neutral-300 transition-colors hover:border-white/40 hover:text-white">
          Drops (lançamentos) →
        </Link>
        <Link href="/mercado/pacotes" className="rounded-full border border-white/15 px-3 py-1 font-semibold text-neutral-300 transition-colors hover:border-white/40 hover:text-white">
          Revenda de pacotes →
        </Link>
      </div>
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
