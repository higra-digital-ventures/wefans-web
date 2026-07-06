import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api-server';
import ChatClient from '@/components/ChatClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chat — wefans' };

// Mensagens diretas (negociação). ?u=username abre direto a conversa.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; draft?: string }>;
}) {
  const [{ u, draft }, me] = await Promise.all([searchParams, getMe()]);
  if (!me) redirect(`/entrar?next=${encodeURIComponent('/chat')}`);

  return (
    <main className="wf-chat h-[calc(100dvh-72px)] overflow-hidden">
      <ChatClient initialWith={u} initialDraft={draft?.slice(0, 300)} />
    </main>
  );
}
