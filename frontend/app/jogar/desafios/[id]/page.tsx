import Icon from '@/components/Icon';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getChallengeServer, getMe } from '@/lib/api-server';
import ChallengeBuilder from '@/components/ChallengeBuilder';
import FlashClaim from '@/components/FlashClaim';
import MomentCard from '@/components/MomentCard';

export const dynamic = 'force-dynamic';

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [challenge, me] = await Promise.all([getChallengeServer(id), getMe()]);
  if (!challenge) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Breadcrumbs items={[{ label: 'Jogar', href: '/jogar/desafios' }, { label: 'Desafios', href: '/jogar/desafios' }, { label: challenge.name }]} />
      <Link href="/jogar/desafios" className="text-sm text-muted hover:text-ink">
        ← Desafios
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="font-display text-4xl uppercase text-ink">{challenge.name}</h1>
        <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {challenge.type === 'CRAFTING' ? 'Bate-troca' : challenge.type === 'FLASH' ? <><Icon name="zap" size={12} className="inline align-[-1px]" /> Relâmpago</> : 'Álbum'}
        </span>
      </div>
      <p className="mb-6 text-muted">{challenge.description}</p>

      <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,280px)]">
        {challenge.type === 'FLASH' && challenge.flash ? (
          <FlashClaim challenge={challenge} isAuthed={!!me} />
        ) : (
          <ChallengeBuilder challenge={challenge} isAuthed={!!me} />
        )}

        {challenge.rewardTemplate ? (
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted">Recompensa</h2>
            <MomentCard template={challenge.rewardTemplate} />
          </div>
        ) : challenge.hasPackReward ? (
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted">Recompensa</h2>
            <div className="rounded-2xl border border-line bg-panel p-6 text-center text-muted">
              <Icon name="gift" size={14} className="inline align-[-2px] text-accent" /> Um pacote exclusivo
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
