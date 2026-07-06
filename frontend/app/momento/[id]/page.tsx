import { redirect, notFound } from 'next/navigation';
import { getMomentServer } from '@/lib/api-server';

export const dynamic = 'force-dynamic';

// /momento/:momentId (exemplar) foi unificada em /moment/:templateId — a página
// da edição virou a página do Momento. Resolve o exemplar para sua edição.
export default async function MomentoRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMomentServer(id).catch(() => null);
  if (!m) notFound();
  redirect(`/moment/${m.template.id}`);
}
