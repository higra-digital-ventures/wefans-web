'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addShowcaseItem, deleteShowcase, removeShowcaseItem, updateShowcase } from '@/lib/api-client';
import type { MomentDTO, ShowcaseDetail } from '@/lib/types';

export default function ShowcaseEditor({
  showcase,
  ownedMoments,
}: {
  showcase: ShowcaseDetail;
  ownedMoments: MomentDTO[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(showcase.name);
  const [isPublic, setIsPublic] = useState(showcase.public);
  const [addId, setAddId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inShowcase = new Set(showcase.items.map((i) => i.moment.id));
  const available = ownedMoments.filter((m) => !inShowcase.has(m.id));

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const field = ' border border-line bg-panel2 px-3 py-2 text-ink outline-none';

  return (
    <div className="rounded-2xl space-y-4  border border-line bg-panel p-5">
      <h2 className="font-semibold text-ink">Editar vitrine</h2>
      {error && <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} flex-1`} />
        <label className="flex items-center gap-1 text-sm text-muted">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> pública
        </label>
        <button
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={pending}
          onClick={() => run(() => updateShowcase(showcase.id, { name, public: isPublic }))}
        >
          Salvar
        </button>
      </div>

      <div>
        <div className="mb-1 text-sm text-muted">Adicionar Momento</div>
        <div className="flex gap-2">
          <select value={addId} onChange={(e) => setAddId(e.target.value)} className={`${field} flex-1`}>
            <option value="">Escolha um Momento…</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.template.player.name} · #{m.serial}
              </option>
            ))}
          </select>
          <button
            className="border border-line px-4 py-2 text-sm text-muted hover:text-ink disabled:opacity-50"
            disabled={!addId || pending}
            onClick={() => run(() => addShowcaseItem(showcase.id, addId).then(() => setAddId('')))}
          >
            Adicionar
          </button>
        </div>
      </div>

      {showcase.items.length > 0 && (
        <ul className="space-y-1">
          {showcase.items.map((i) => (
            <li key={i.moment.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                {i.moment.template.player.name} <span className="text-muted">#{i.moment.serial}</span>
              </span>
              <button
                className="text-xs text-accent hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={() => run(() => removeShowcaseItem(showcase.id, i.moment.id))}
              >
                remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        className="text-sm text-accent hover:underline disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (confirm('Excluir esta vitrine?')) run(async () => { await deleteShowcase(showcase.id); router.push('/vitrines'); });
        }}
      >
        Excluir vitrine
      </button>
    </div>
  );
}
