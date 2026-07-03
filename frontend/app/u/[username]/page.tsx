import { notFound } from 'next/navigation';
import { getPublicCollectionServer, getPublicProfileServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import { dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfileServer(username);
  if (!profile) notFound();
  const moments = await getPublicCollectionServer(username);

  const kpis = [
    { label: 'Pontuação wefans', value: profile.topShotScore.toLocaleString('pt-BR') },
    { label: 'Score do Colecionador', value: profile.collectorScore.toLocaleString('pt-BR') },
    { label: 'Lances', value: profile.momentCount.toLocaleString('pt-BR') },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl uppercase text-ink">
          @{profile.username}
          {profile.isAdmin && (
            <span className="ml-2  bg-accent2/20 px-2 py-0.5 align-middle text-xs text-accent2">
              admin
            </span>
          )}
        </h1>
        <p className="text-sm text-muted">
          membro desde {dateTime(profile.createdAt).split(',')[0]}
          {profile.favoriteTeam && ` · torce pro ${profile.favoriteTeam.name}`}
        </p>
      </header>

      <div className="mb-10 grid max-w-lg grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="border border-line bg-panel p-4">
            <div className="font-display text-2xl text-ink">{k.value}</div>
            <div className="mt-1 text-xs text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Coleção</h2>
      {moments.length === 0 ? (
        <p className="text-muted">Sem Lances públicos ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {moments.map((m) => (
            <LanceCard key={m.id} template={m.template} serial={m.serial} href={`/momento/${m.id}`} />
          ))}
        </div>
      )}
    </main>
  );
}
