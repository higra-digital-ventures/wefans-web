import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api-server';
import ChatClient from '@/components/ChatClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chat — wefans' };

// Mensagens diretas (negociação). ?u=username abre direto a conversa.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const [{ u }, me] = await Promise.all([searchParams, getMe()]);
  if (!me) redirect(`/entrar?next=${encodeURIComponent('/chat')}`);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      <ChatClient initialWith={u} />
    </main>
  );
}
