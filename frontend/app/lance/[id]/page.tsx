import { redirect } from 'next/navigation';

// A página da edição virou /edicao/:id — mantém links antigos funcionando.
export default async function LanceRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/edicao/${id}`);
}
