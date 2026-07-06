import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getMe,
  getMyStatsServer,
  getTeamsServer,
  getWalletServer,
  getWishlistServer,
  getCollectionServer,
} from '@/lib/api-server';
import PerfilClient from '@/components/PerfilClient';
import MomentCard from '@/components/MomentCard';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';
import { dateTime, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const me = await getMe();
  if (!me) redirect('/entrar');

  const [wallet, teams, stats, wishlist, collection] = await Promise.all([
    getWalletServer(),
    getTeamsServer(),
    getMyStatsServer(),
    getWishlistServer(),
    getCollectionServer().catch(() => null),
  ]);
  const wl = wishlist ?? [];
  const col = collection ?? [];
  // Destaques (pinned do Top Shot): os 3 Momentos mais valiosos pela média
  const pinned = [...col].sort((a, b) => (b.template.aspCents || 0) - (a.template.aspCents || 0)).slice(0, 3);
  // Coleção por Times (clube do jogador)
  const byClub = new Map<string, number>();
  for (const m of col) byClub.set(m.template.player.club, (byClub.get(m.template.player.club) ?? 0) + 1);
  const clubs = [...byClub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const card = ' border border-line bg-panel p-5';

  return (
    <PerfilClient me={me} wallet={wallet} teams={teams} momentCount={stats?.momentCount ?? 0} percentile={stats?.percentile}>
      <section className={`${card} mt-6`}>
        <h2 className="mb-3 font-semibold text-ink">Destaques</h2>
        {pinned.length === 0 ? (
          <p className="text-sm text-muted">
            Sem Momentos ainda —{' '}
            <Link href="/pacotes" className="text-accent3 underline">
              abra um pacote
            </Link>{' '}
            para montar seus destaques.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pinned.map((m) => (
              <MomentCard key={m.id} template={m.template} serial={m.serial} href={`/momento/${m.id}`} />
            ))}
          </div>
        )}
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="mb-3 font-semibold text-ink">Coleção por times</h2>
        {clubs.length === 0 ? (
          <p className="text-sm text-muted">
            Nada por time ainda — encontre craques no{' '}
            <Link href="/mercado" className="text-accent3 underline">
              mercado
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {clubs.map(([club, n]) => (
              <Link
                key={club}
                href={`/mercado?q=${encodeURIComponent(club)}`}
                className="rounded-2xl flex items-center justify-between border border-line bg-[#0a0a0b] px-3 py-2.5 transition-colors hover:border-white/30"
              >
                <span className="text-[13px] font-semibold text-ink">{club}</span>
                <span className="tabular-nums text-[12px] text-accent3">{n} Momento{n > 1 ? 's' : ''}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {stats && stats.momentCount > 0 && (
        <section className={`${card} mt-6`}>
          <h2 className="mb-3 font-semibold text-ink">Coleção por raridade</h2>
          <div className="flex flex-wrap gap-2">
            {TIER_ORDER.map((t) => {
              const n = stats.tierCounts[t] ?? 0;
              if (!n) return null;
              const meta = TIER_META[t];
              return (
                <span
                  key={t}
                  className="rounded-full px-3 py-1 text-sm"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  {meta.label} · {n}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section className={`${card} mt-6`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Wishlist</h2>
          <Link href="/explorar" className="text-sm text-accent3 hover:underline">
            explorar →
          </Link>
        </div>
        {wl.length === 0 ? (
          <p className="text-sm text-muted">
            Marque Momentos na página da edição (★) para acompanhá-los aqui.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {wl.map((t) => (
              <MomentCard key={t.id} template={t} href={`/edicao/${t.id}`} />
            ))}
          </div>
        )}
      </section>

      {stats && stats.openedPacks.length > 0 && (
        <section className={`${card} mt-6`}>
          <h2 className="mb-3 font-semibold text-ink">Pacotes abertos</h2>
          <ul className="divide-y divide-line">
            {stats.openedPacks.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{p.packName}</span>
                <span className="tabular-nums text-xs text-muted" title={dateTime(p.createdAt)}>
                  {timeAgo(p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PerfilClient>
  );
}
