'use client';

import Icon from './Icon';
import { useEffect, useRef, useState } from 'react';
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
  const touchX = useRef<number | null>(null);
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
      icon: 'chat' as const,
    },
    {
      href: '/ofertas',
      label: 'Minhas ofertas',
      dot: false,
      icon: 'tag' as const,
    },
    {
      href: '/colecao',
      label: 'Minha coleção',
      dot: false,
      icon: 'collection' as const,
    },
    {
      href: '/perfil',
      label: 'Configurações da conta',
      dot: false,
      icon: 'settings' as const,
    },
  ];

  return (
    <>
      <button
        aria-label={`Abrir menu do perfil de ${me.username}`}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-sunset text-[15px] font-bold uppercase text-white transition-transform hover:scale-105"
      >
        {me.username[0]}
      </button>

      {open &&
        mounted &&
        createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu do perfil">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
          <aside
            className="rounded-l-2xl wf-drawer absolute inset-y-0 right-0 flex w-[86vw] max-w-[340px] flex-col border-l border-white/10 bg-[#0a0a0b] shadow-[-20px_0_60px_rgba(0,0,0,.7)]"
            // gesto: arrastar para a direita fecha (mobile)
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchX.current != null && e.changedTouches[0].clientX - touchX.current > 60) setOpen(false);
              touchX.current = null;
            }}
          >
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
                <Icon name="close" size={20} />
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
                <span className="tabular-nums text-[14px] font-bold text-white">
                  {me.topShotScore.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* menu */}
            <nav className="flex-1 overflow-y-auto py-2">
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} onClick={() => setOpen(false)} className={item}>
                  <Icon name={m.icon} size={20} className="text-neutral-300" />
                  {m.label}
                  {m.dot && <span className="ml-auto h-2 w-2 rounded-full bg-accent" aria-label="não lidas" />}
                </Link>
              ))}
              {me.isAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)} className={item}>
                  <Icon name="shield" size={20} className="text-accent2" />
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
              <Icon name="logout" size={20} />
              Sair
            </button>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
