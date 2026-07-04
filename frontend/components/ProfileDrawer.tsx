'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchChats, logout } from '@/lib/api-client';
import { brl } from '@/lib/format';

// Drawer do perfil (padrão do Top Shot): avatar abre painel lateral direito com
// carteira, score, atalhos (Mensagens/Ofertas/Coleção/Configurações) e Sair.
export default function ProfileDrawer({
  me,
}: {
  me: { username: string; balanceCents: number; topShotScore: number; isAdmin: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    fetchChats()
      .then((r) => setUnreadChats(r.totalUnread))
      .catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const item =
    'flex w-full items-center gap-3 px-5 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/5';

  const MENU = [
    {
      href: '/chat',
      label: 'Mensagens',
      dot: unreadChats > 0,
      d: 'M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2Z',
    },
    {
      href: '/ofertas',
      label: 'Minhas ofertas',
      dot: false,
      d: 'M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8ZM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8Z',
    },
    {
      href: '/colecao',
      label: 'Minha coleção',
      dot: false,
      d: 'M4 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm14 3h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-2v-2h2V8h-2V6Z',
    },
    {
      href: '/perfil',
      label: 'Configurações da conta',
      dot: false,
      d: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2-1.2L16 3h-4l-.5 2.6a7.7 7.7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 7 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1c.6.5 1.3.9 2 1.2L12 21h4l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z',
    },
  ];

  return (
    <>
      <button
        aria-label={`Abrir menu do perfil de ${me.username}`}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset text-sm font-bold uppercase text-white transition-transform hover:scale-105"
      >
        {me.username[0]}
      </button>

      {open &&
        mounted &&
        createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu do perfil">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
          <aside className="wf-drawer absolute inset-y-0 right-0 flex w-[86vw] max-w-[340px] flex-col border-l border-white/10 bg-[#0a0a0b] shadow-[-20px_0_60px_rgba(0,0,0,.7)]">
            {/* cabeçalho: avatar + username + ver perfil + fechar */}
            <div className="flex items-start gap-3 px-5 pb-4 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunset text-lg font-bold uppercase text-white">
                {me.username[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold text-white">@{me.username}</span>
                <Link
                  href={`/u/${me.username}`}
                  onClick={() => setOpen(false)}
                  className="text-[12px] text-neutral-400 underline underline-offset-2 hover:text-white"
                >
                  Ver perfil público
                </Link>
              </span>
              <button
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* carteira + score */}
            <div className="border-y border-white/10">
              <div className="flex items-baseline justify-between px-5 py-3.5">
                <span className="text-[15px] font-bold text-white" title="Saldo de teste — nenhum dinheiro real">
                  {brl(me.balanceCents)}
                </span>
                <Link
                  href="/perfil"
                  onClick={() => setOpen(false)}
                  className="text-[12px] font-semibold text-accent3 underline underline-offset-2 hover:text-white"
                >
                  Depositar
                </Link>
              </div>
              <div className="flex items-baseline justify-between border-t border-white/10 px-5 py-3.5">
                <span className="text-[13px] text-neutral-300">Pontuação wefans</span>
                <span className="font-mono text-[14px] font-bold text-white">
                  {me.topShotScore.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* menu */}
            <nav className="flex-1 overflow-y-auto py-2">
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} onClick={() => setOpen(false)} className={item}>
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-neutral-300" aria-hidden>
                    <path d={m.d} />
                  </svg>
                  {m.label}
                  {m.dot && <span className="ml-auto h-2 w-2 rounded-full bg-accent" aria-label="não lidas" />}
                </Link>
              ))}
              {me.isAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)} className={item}>
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-accent2" aria-hidden>
                    <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5L9 11l2 2 4-4 1.5 1.5L11 16Z" />
                  </svg>
                  <span className="text-accent2">Painel admin</span>
                </Link>
              )}
            </nav>

            {/* sair */}
            <button
              onClick={async () => {
                try {
                  await logout();
                } catch {
                  /* sessão já podia estar expirada */
                }
                setOpen(false);
                router.push('/');
                router.refresh();
              }}
              className="flex items-center gap-3 border-t border-white/10 px-5 py-4 text-[14px] font-semibold text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
                <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5V3Zm5 4-1.4 1.4L16.2 11H9v2h7.2l-2.6 2.6L15 17l5-5-5-5Z" />
              </svg>
              Sair
            </button>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
