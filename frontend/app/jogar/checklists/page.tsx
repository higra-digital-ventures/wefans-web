import Link from 'next/link';
import { getChecklistsServer, getMe } from '@/lib/api-server';
import ChecklistClaimButton from '@/components/ChecklistClaimButton';

export const dynamic = 'force-dynamic';

export default async function ChecklistsPage() {
  const [checklists, me] = await Promise.all([getChecklistsServer(), getMe()]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-1 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-4xl uppercase text-ink">Checklists</h1>
        <Link href="/jogar/rankings" className="text-sm text-accent3 hover:underline">
          rankings →
        </Link>
      </div>
      <p className="mb-8 text-muted">Complete coleções e ganhe bônus no ranking do time e no seu Score.</p>

      {checklists.length === 0 ? (
        <p className="text-muted">Nenhum checklist ativo.</p>
      ) : (
        <div className="space-y-4">
          {checklists.map((c) => {
            const complete = !!c.progress && c.progress.have >= c.progress.need;
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-ink">{c.name}</h3>
                    <p className="text-xs text-muted">bônus: +{c.bonusPoints} pts</p>
                  </div>
                  <ChecklistClaimButton
                    checklistId={c.id}
                    complete={complete}
                    claimed={c.claimed}
                    isAuthed={!!me}
                  />
                </div>
                {c.progress && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Progresso</span>
                      <span>
                        {c.progress.have}/{c.progress.need}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-panel2">
                      <div
                        className="h-1.5 rounded-full bg-accent3"
                        style={{ width: `${(c.progress.have / Math.max(1, c.progress.need)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
