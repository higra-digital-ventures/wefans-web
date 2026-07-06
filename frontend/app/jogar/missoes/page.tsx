import EmptyState from '@/components/EmptyState';
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
      <p className="mb-8 text-muted">Caças ao tesouro fora de campo: monte vitrines, cumpra objetivos especiais e leve Lances de brinde.</p>

      {quests.length === 0 ? (
        <EmptyState
          title="Nenhuma missão aberta agora"
          hint="Missões novas caem sem aviso — de olho no feed."
          cta={{ label: 'Ir para o feed', href: '/explorar' }}
        />
      ) : (
        <div className="space-y-4">
          {quests.map((q) => (
            <div key={q.id} className="rounded-2xl flex items-center justify-between gap-4  border border-line bg-panel p-5">
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
