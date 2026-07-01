import Link from 'next/link';
import { getMe, getQuestsServer } from '@/lib/api-server';
import QuestClaimButton from '@/components/QuestClaimButton';

export const dynamic = 'force-dynamic';

export default async function MissoesPage() {
  const [quests, me] = await Promise.all([getQuestsServer(), getMe()]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-1 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-4xl uppercase text-ink">Missões</h1>
        <Link href="/jogar/desafios" className="text-sm text-accent3 hover:underline">
          desafios →
        </Link>
      </div>
      <p className="mb-8 text-muted">Complete objetivos (ex.: montar uma vitrine) e ganhe recompensas.</p>

      {quests.length === 0 ? (
        <p className="text-muted">Nenhuma missão ativa.</p>
      ) : (
        <div className="space-y-4">
          {quests.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel p-5">
              <div>
                <h3 className="font-display text-xl text-ink">{q.name}</h3>
                <p className="text-sm text-muted">{q.description}</p>
              </div>
              <QuestClaimButton questId={q.id} eligible={q.eligible} claimed={q.claimed} isAuthed={!!me} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
