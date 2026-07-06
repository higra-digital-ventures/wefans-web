'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import type { PublicProfile } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const cache = new Map<string, PublicProfile>();

// Mini-perfil no hover (padrão X): pontuação, Lances e atalhos sem sair do feed.
// Só desktop — no touch o clique já leva ao perfil público.
export default function UserHoverCard({ username, children }: { username: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(cache.get(username) ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    if (cache.has(username)) {
      setProfile(cache.get(username)!);
      return;
    }
    try {
      const res = await fetch(`${API}/api/v1/users/${encodeURIComponent(username)}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const d = (await res.json()) as { profile: PublicProfile };
      cache.set(username, d.profile);
      setProfile(d.profile);
    } catch {
      /* rede fora — o popover fica no "carregando" e o clique segue funcionando */
    }
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => {
        timer.current = setTimeout(() => {
          setOpen(true);
          load();
        }, 350);
      }}
      onMouseLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setOpen(false);
      }}
    >
      {children}
      {open && (
        <span className="rounded-2xl absolute left-0 top-full z-40 mt-1.5 block w-[250px] border border-white/15 bg-[#101012] p-3.5 shadow-[0_16px_40px_rgba(0,0,0,.7)]">
          {profile ? (
            <>
              <span className="block text-[14px] font-bold text-white">@{profile.username}</span>
              <span className="mt-0.5 block text-[11px] text-neutral-500">
                desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                {profile.favoriteTeam ? ` · torce pro ${profile.favoriteTeam.name}` : ''}
              </span>
              <span className="mt-2 flex gap-4 text-[12px]">
                <span>
                  <span className="block font-bold tabular-nums text-white">
                    {profile.topShotScore.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">pontos</span>
                </span>
                <span>
                  <span className="block font-bold tabular-nums text-white">
                    {profile.momentCount.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">Lances</span>
                </span>
              </span>
              <span className="mt-2.5 flex gap-1.5">
                <Link
                  href={`/u/${profile.username}`}
                  className="flex-1 border border-white/25 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
                >
                  Ver perfil
                </Link>
                <Link
                  href={`/chat?u=${encodeURIComponent(profile.username)}`}
                  title="Mensagem"
                  className="flex w-9 items-center justify-center border border-white/25 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icon name="chat" size={14} />
                </Link>
              </span>
            </>
          ) : (
            <span className="block py-2 text-center text-[11px] text-neutral-500">carregando…</span>
          )}
        </span>
      )}
    </span>
  );
}
