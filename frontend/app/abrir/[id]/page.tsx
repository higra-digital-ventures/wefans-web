import OpenPackClient from '@/components/OpenPackClient';

export const dynamic = 'force-dynamic';

export default async function AbrirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <OpenPackClient inventoryId={id} />
    </main>
  );
}
