'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchNotifications, markNotificationsSeen } from '@/lib/api-client';
import Icon from './Icon';
import type { NotificationDTO } from '@/lib/types';

// Sino de notificações (padrão do Top Shot): badge com não-lidas, dropdown escuro
// com a lista derivada dos eventos do usuário. Abrir marca tudo como lido.

const KIND_META: Record<NotificationDTO['kind'], { color: string; d: string }> = {
  SALE: {
    color: '#22c55e',
    d: 'M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8ZM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8Z',
  },
  GIFT: {
    color: '#ff2e88',
    d: 'M20 7h-2.2A3.5 3.5 0 0 0 12 3.3 3.5 3.5 0 0 0 6.2 7H4a1 1 0 0 0-1 1v3h18V8a1 1 0 0 0-1-1ZM9.5 4A1.5 1.5 0 0 1 11 5.5V7H9.5a1.5 1.5 0 0 1 0-3Zm5 3H13V5.5A1.5 1.5 0 1 1 14.5 7ZM3 13v7a1 1 0 0 0 1 1h7v-8H3Zm10 8h7a1 1 0 0 0 1-1v-7h-8v8Z',
  },
  OFFER: {
    color: '#21d4e0',
    d: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z',
  },
  CHECKIN: {
    color: '#9d4edd',
    d: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
  },
  DROP_WINDOW: {
    color: '#ff9e2c',
    d: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.2 13.2-5.2-3V7h2v4.1l4.2 2.4Z',
  },
  WISHLIST: {
    color: '#f59e0b',
    d: 'M6 2h12a1 1 0 0 1 1 1v19l-7-4.2L5 22V3a1 1 0 0 1 1-1Zm6 3-1.4 2.9-3.1.4 2.3 2.2-.6 3.1L12 12l2.8 1.6-.6-3.1 2.3-2.2-3.1-.4L12 5Z',
  },
  MATCHDAY: {
    color: '#f7f7f8',
    d: 'M18 4V2H6v2H2v3a5 5 0 0 0 5 5h.4A6 6 0 0 0 11 14.9V18H7v4h10v-4h-4v-3.1a6 6 0 0 0 3.6-2.9H17a5 5 0 0 0 5-5V4ZM4 7V6h2v4a3 3 0 0 1-2-3Zm16 0a3 3 0 0 1-2 3V6h2Z',
  },
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d.getTime() >= startToday) return 'Hoje';
  if (d.getTime() >= startToday - oneDay) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(0);
  const [seenBefore, setSeenBefore] = useState<string | null>(null); // p/ manter o ponto "novo" na lista aberta
  const rootRef = useRef<HTMLDivElement>(null);

  // sonda as não-lidas ao montar e a cada 45s
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { notifications, unreadCount } = await fetchNotifications();
        if (!alive) return;
        setItems(notifications);
        setUnread(unreadCount);
        // badge de não-lidas no título da aba
        const base = document.title.replace(/^\(\d+\+?\) /, '');
        document.title = unreadCount > 0 ? `(${unreadCount > 9 ? '9+' : unreadCount}) ${base}` : base;
      } catch {
        // deslogado ou rede fora — sino fica quieto
      }
    };
    load();
    const timer = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // fecha com clique fora / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // o ponto "novo" desta abertura considera o que era não-lido até agora
      setSeenBefore(items[unread - 1]?.createdAt ?? null);
      setUnread(0);
      markNotificationsSeen().catch(() => {});
    } else if (next) {
      setSeenBefore(null);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-label={unread > 0 ? `Notificações (${unread} novas)` : 'Notificações'}
        onClick={toggle}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-panel2 ${
          open ? 'bg-panel2 text-ink' : 'text-muted hover:text-ink'
        }`}
      >
        <Icon name="bell" filled={open || unread > 0} size={22} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {unread > 0 ? `${unread} notificações não lidas` : ''}
      </span>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[92vw] max-w-[380px] border border-white/10 bg-[#0c0c0e] shadow-[0_20px_50px_rgba(0,0,0,.7)]">
          <div className="flex items-baseline justify-between border-b border-white/10 px-4 py-3">
            <span className="text-[14px] font-bold text-white">Notificações</span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">
              {items.length === 0 ? '' : 'mais recentes primeiro'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-neutral-400">Nada por aqui ainda.</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Vendas, ofertas, presentes e check-ins aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="max-h-[420px] divide-y divide-white/[0.06] overflow-y-auto">
              {items.map((n, i) => {
                const meta = KIND_META[n.kind];
                const isNew = seenBefore != null && n.createdAt >= seenBefore;
                const label = dayLabel(n.createdAt);
                const showDay = i === 0 || dayLabel(items[i - 1].createdAt) !== label;
                return (
                  <li key={n.id}>
                    {showDay && (
                      <div className="bg-[#101012] px-4 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                        {label}
                      </div>
                    )}
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center"
                        style={{ background: `${meta.color}1a` }}
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" style={{ fill: meta.color }}>
                          <path d={meta.d} />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-bold text-white">
                            {n.title}
                            {isNew && (
                              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                            )}
                          </span>
                          <span className="shrink-0 text-[10px] text-neutral-500">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-neutral-400">
                          {n.body}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/explorar"
            onClick={() => setOpen(false)}
            className="block border-t border-white/10 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Ver toda a atividade
          </Link>
        </div>
      )}
    </div>
  );
}
