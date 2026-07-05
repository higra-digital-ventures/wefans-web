import Icon from '@/components/Icon';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMe, getPublicCollectionServer, getPublicProfileServer, getPublicWishlistServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import { dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, me] = await Promise.all([getPublicProfileServer(username), getMe()]);
  if (!profile) notFound();
  const [moments, publicWishlist] = await Promise.all([
    getPublicCollectionServer(username),
    getPublicWishlistServer(username).catch(() => []),
  ]);
  const canMessage = !!me && me.username !== profile.username;

  const kpis = [
    {
      label: 'Pontuação wefans',
      hint: 'O valor da coleção em pontos — cada Lance soma conforme a raridade.',
      value: profile.topShotScore.toLocaleString('pt-BR'),
    },
    {
      label: 'Score do Colecionador',
      hint: 'Usado nas filas de drop: pontos por raridade + bônus de desafios e check-ins.',
      value: profile.collectorScore.toLocaleString('pt-BR'),
    },
    { label: 'Lances', hint: undefined, value: profile.momentCount.toLocaleString('pt-BR') },
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
        {canMessage && (
          <Link
            href={`/chat?u=${encodeURIComponent(profile.username)}`}
            className="mt-3 inline-flex items-center gap-2 border border-white/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/10"
          >
            <Icon name="chat" size={16} />
            Mensagem
          </Link>
        )}
      </header>

      <div className="mb-10 grid max-w-lg grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} title={k.hint} className="border border-line bg-panel p-4">
            <div className="font-display text-2xl text-ink">{k.value}</div>
            <div className="mt-1 text-xs text-muted">
              {k.label}
              {k.hint && ' ⓘ'}
            </div>
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
      {publicWishlist.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight text-ink">Wishlist</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {publicWishlist.slice(0, 4).map((t) => (
              <LanceCard key={t.id} template={t} href={`/lance/${t.id}`} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
