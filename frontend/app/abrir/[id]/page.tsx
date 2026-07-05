import OpenPackClient from '@/components/OpenPackClient';

export const dynamic = 'force-dynamic';

export default async function AbrirPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const [{ id }, { auto }] = await Promise.all([params, searchParams]);
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <OpenPackClient inventoryId={id} auto={auto === '1'} />
    </main>
  );
}
