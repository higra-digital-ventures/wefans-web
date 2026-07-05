import Breadcrumbs from '@/components/Breadcrumbs';
import { notFound } from 'next/navigation';
import { getCollectionServer, getShowcaseServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import ShowcaseEditor from '@/components/ShowcaseEditor';

export const dynamic = 'force-dynamic';

export default async function VitrinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const showcase = await getShowcaseServer(id);
  if (!showcase) notFound();
  const owned = showcase.isOwner ? ((await getCollectionServer('')) ?? []) : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Breadcrumbs
        items={[
          { label: 'Vitrines', href: '/vitrines' },
          { label: showcase.name },
        ]}
      />
      <h1 className="font-display text-4xl uppercase text-ink">{showcase.name}</h1>
      <p className="mb-6 text-muted">
        {showcase.description}
        {showcase.ownerUsername ? ` · por @${showcase.ownerUsername}` : ''}
        {!showcase.public ? ' · privada' : ''}
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,320px)]">
        <div>
          {showcase.items.length === 0 ? (
            <p className="text-muted">Vitrine vazia.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {showcase.items.map((i) => (
                <LanceCard
                  key={i.moment.id}
                  template={i.moment.template}
                  serial={i.moment.serial}
                  href={`/momento/${i.moment.id}`}
                />
              ))}
            </div>
          )}
        </div>
        {showcase.isOwner && <ShowcaseEditor showcase={showcase} ownedMoments={owned} />}
      </div>
    </main>
  );
}
