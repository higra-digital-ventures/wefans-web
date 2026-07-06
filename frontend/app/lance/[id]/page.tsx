import { redirect } from 'next/navigation';

// A página virou /moment/:id — mantém links antigos (/lance) funcionando.
export default async function LanceRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/moment/${id}`);
}
