'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api-client';

export default function AdminCreateTeam() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: '', stadiumName: '', city: '', lat: '', lng: '' });
  const [error, setError] = useState<string | null>(null);
  const ok = f.name && f.stadiumName && f.city && f.lat && f.lng;
  const field = ' border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60';

  return (
    <div className="border border-line bg-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Novo time parceiro (+ estádio)</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input className={field} placeholder="Nome do time" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={field} placeholder="Estádio" value={f.stadiumName} onChange={(e) => setF({ ...f, stadiumName: e.target.value })} />
        <input className={field} placeholder="Cidade" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        <input className={field} placeholder="Lat" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
        <input className={field} placeholder="Lng" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
      </div>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
      <button
        disabled={!ok || pending}
        className="mt-3  bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => {
          setError(null);
          start(async () => {
            try {
              await adminPost('/admin/teams', { name: f.name, stadiumName: f.stadiumName, city: f.city, lat: Number(f.lat), lng: Number(f.lng) });
              setF({ name: '', stadiumName: '', city: '', lat: '', lng: '' });
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erro');
            }
          });
        }}
      >
        {pending ? 'Criando…' : 'Criar (em rascunho)'}
      </button>
    </div>
  );
}
