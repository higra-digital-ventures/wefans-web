import Link from 'next/link';
import { getChallengesServer } from '@/lib/api-server';
import type { ChallengeSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

function timeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'encerrado';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function Card({ c }: { c: ChallengeSummary }) {
  return (
    <Link
      href={`/jogar/desafios/${c.id}`}
      className="block rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-accent/40"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {c.type === 'CRAFTING' ? 'Forja' : 'Padrão'}
        </span>
        {c.active && <span className="text-xs text-muted">{timeLeft(c.endsAt)}</span>}
      </div>
      <h3 className="font-display text-xl text-ink">{c.name}</h3>
      <p className="mb-3 line-clamp-2 text-sm text-muted">{c.description}</p>
      {c.completed ? (
        <span className="text-sm text-emerald-300">✓ Concluído</span>
      ) : c.progress ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Progresso</span>
            <span>
              {c.progress.have}/{c.progress.need}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-panel2">
            <div
              className="h-1.5 rounded-full bg-accent"
              style={{ width: `${(c.progress.have / c.progress.need) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
    </Link>
  );
}

export default async function DesafiosPage() {
  const challenges = await getChallengesServer();
  const active = challenges.filter((c) => c.active && !c.completed);
  const completed = challenges.filter((c) => c.completed);
  const past = challenges.filter((c) => !c.active && !c.completed);

  const Section = ({ title, list }: { title: string; list: ChallengeSummary[] }) =>
    list.length === 0 ? null : (
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} c={c} />
          ))}
        </div>
      </section>
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-1 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-4xl uppercase text-ink">Desafios</h1>
        <span className="text-sm">
          <Link href="/jogar/missoes" className="text-accent3 hover:underline">
            Missões
          </Link>
          <span className="text-muted/50" title="Em breve"> · Rankings · Pelada</span>
        </span>
      </div>
      <p className="mb-8 text-muted">Complete coleções e forje Lances para ganhar recompensas.</p>

      <Section title="Ativos" list={active} />
      <Section title="Concluídos" list={completed} />
      <Section title="Anteriores" list={past} />
      {challenges.length === 0 && <p className="text-muted">Nenhum desafio no momento.</p>}
    </main>
  );
}
