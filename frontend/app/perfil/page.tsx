import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getMe,
  getMyStatsServer,
  getTeamsServer,
  getWalletServer,
  getWishlistServer,
} from '@/lib/api-server';
import PerfilClient from '@/components/PerfilClient';
import LanceCard from '@/components/LanceCard';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';
import { dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const me = await getMe();
  if (!me) redirect('/entrar');

  const [wallet, teams, stats, wishlist] = await Promise.all([
    getWalletServer(),
    getTeamsServer(),
    getMyStatsServer(),
    getWishlistServer(),
  ]);
  const wl = wishlist ?? [];
  const card = ' border border-line bg-panel p-5';

  return (
    <PerfilClient me={me} wallet={wallet} teams={teams} momentCount={stats?.momentCount ?? 0}>
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
            Marque Lances na página da edição (★) para acompanhá-los aqui.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {wl.map((t) => (
              <LanceCard key={t.id} template={t} href={`/lance/${t.id}`} />
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
                <span className="font-mono text-xs text-muted">{dateTime(p.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PerfilClient>
  );
}
