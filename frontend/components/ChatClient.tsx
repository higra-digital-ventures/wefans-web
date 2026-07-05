'use client';

import Icon from './Icon';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchChats, fetchThread, sendChatMessage } from '@/lib/api-client';
import { timeAgo } from '@/lib/format';
import type { ChatSummary, ChatMessageDTO } from '@/lib/types';

// Chat 1:1 no layout do Top Shot: rail esquerdo (busca + filtro + conversas) e
// painel da conversa à direita, com polling leve enquanto a tela está aberta.
export default function ChatClient({ initialWith }: { initialWith?: string }) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState<string | null>(initialWith ?? null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    try {
      const r = await fetchChats();
      setChats(r.chats);
    } catch {
      router.push(`/entrar?next=${encodeURIComponent('/chat')}`);
    }
  };

  const loadThread = async (username: string) => {
    try {
      const r = await fetchThread(username);
      setMessages(r.messages);
      setChats((cs) => cs?.map((c) => (c.username === username ? { ...c, unread: 0 } : c)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao abrir a conversa');
    }
  };

  // carga inicial + polling (10s) da lista e da conversa aberta
  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!active) return;
    setError(null);
    loadThread(active);
    const t = setInterval(() => loadThread(active), 5_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || !active || sending) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await sendChatMessage(active, body);
      setMessages((m) => [...m, message]);
      setDraft('');
      loadChats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar');
    } finally {
      setSending(false);
    }
  }

  const visible = (chats ?? [])
    .filter((c) => (filter === 'unread' ? c.unread > 0 : true))
    .filter((c) => (search ? c.username.toLowerCase().includes(search.toLowerCase()) : true));

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[400px_1fr]">
      {/* rail esquerdo: CHAT + busca (atrás do botão) + filtro + conversas */}
      <aside className="flex h-full flex-col overflow-y-auto border-r border-white/10 p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-extrabold uppercase tracking-[0.01em] text-white">Chat</h1>
          <button
            aria-label={searchOpen ? 'Fechar busca' : 'Buscar conversa'}
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearch('');
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              searchOpen ? 'bg-white/15 text-white' : 'bg-[#17171a] text-neutral-300 hover:text-white'
            }`}
          >
            <Icon name="search" size={16} />
          </button>
        </div>
        {searchOpen && (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa"
            className="mt-3 h-9 w-full border border-white/25 bg-transparent px-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white"
          />
        )}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
          className="mt-2 h-9 w-full border border-white/25 bg-black px-2 text-[12px] font-semibold uppercase tracking-wide text-white outline-none"
        >
          <option value="all">Todas</option>
          <option value="unread">Não lidas</option>
        </select>

        <div className="mt-4 space-y-1">
          {chats === null ? (
            <p className="border border-white/10 bg-[#101012] p-4 text-center text-[12px] text-neutral-400">
              Carregando…
            </p>
          ) : visible.length === 0 ? (
            <p className="border border-white/10 bg-[#101012] p-4 text-center text-[12px] text-neutral-400">
              Você ainda não tem conversas
            </p>
          ) : (
            visible.map((c) => (
              <button
                key={c.username}
                onClick={() => setActive(c.username)}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors ${
                  active === c.username ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunset text-[11px] font-bold uppercase text-white">
                  {c.username[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-bold text-white">@{c.username}</span>
                    <span className="shrink-0 text-[10px] text-neutral-500">{timeAgo(c.lastAt)}</span>
                  </span>
                  <span className="block truncate text-[11px] text-neutral-400">
                    {c.lastMine && 'você: '}
                    {c.lastBody}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* painel da conversa */}
      <section className="flex h-full min-h-0 flex-col p-5">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 flex flex-col items-center gap-1.5" aria-hidden>
              <div className="flex gap-6">
                {['#21d4e0', '#9d4edd'].map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full" style={{ background: c, opacity: 0.9 }} />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="h-4 w-4 rounded-full" style={{ background: '#3b82f6', opacity: 0.9 }} />
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Icon name="chat" filled size={16} className="text-white" />
                </span>
                <span className="h-4 w-4 rounded-full" style={{ background: '#ff2e88', opacity: 0.9 }} />
              </div>
              <div className="flex gap-6">
                {['#ff9e2c', '#22c55e'].map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full" style={{ background: c, opacity: 0.9 }} />
                ))}
              </div>
            </div>
            <h2 className="font-display text-2xl uppercase text-white">Dê o primeiro passo</h2>
            <p className="mt-1 max-w-xs text-[13px] text-neutral-400">
              Comece uma conversa, negocie sua próxima grande troca e conecte-se com
              colecionadores. O botão “Mensagem” fica no perfil de cada um.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sunset text-[11px] font-bold uppercase text-white">
                {active[0]}
              </span>
              <a href={`/u/${active}`} className="text-[15px] font-bold text-white hover:underline">
                @{active}
              </a>
              <span className="ml-auto text-[10px] uppercase tracking-wide text-neutral-500">
                negociação direta — combine aqui, feche pelo mercado
              </span>
            </header>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-4">
              {messages.length === 0 && (
                <p className="py-8 text-center text-[12px] text-neutral-500">
                  Sem mensagens ainda — puxe o assunto.
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 text-[13px] leading-snug ${
                      m.mine ? 'bg-accent text-white' : 'bg-[#17171a] text-neutral-200'
                    }`}
                  >
                    {m.body}
                    <div className={`mt-0.5 text-[9px] ${m.mine ? 'text-white/60' : 'text-neutral-500'}`}>
                      {timeAgo(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {error && <p className="mb-2 text-xs text-accent">{error}</p>}
            <form
              className="flex gap-2 border-t border-white/10 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder={`Mensagem para @${active}`}
                className="h-11 min-w-0 flex-1 border border-white/25 bg-transparent px-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white"
              />
              <button
                disabled={sending || !draft.trim()}
                className="bg-accent px-5 text-[12px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? '…' : 'Enviar'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
