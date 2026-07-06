import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// /edicao/:id foi unificada em /moment/:id (uma página por jogada, modelo Top Shot).
export default async function EdicaoRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/moment/${id}`);
}
