import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMomentServer } from '@/lib/api-server';
import LanceCard from '@/components/LanceCard';
import OwnershipStats from '@/components/OwnershipStats';
import { TIER_META, editionLabel } from '@/lib/tiers';
import { brl, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MomentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMomentServer(id);
  if (!m) notFound();

  const t = m.template;
  const meta = TIER_META[t.tier];
  const burned = t.mintedCount - t.circulatingCount;
  const stat = (label: string, value: string) => (
    <div>
      <div className="font-display text-xl text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Temporada 1</span>
        <span>·</span>
        <span>{t.player.club}</span>
        <span>·</span>
        <Link href={`/lance/${t.id}`} className="hover:text-ink">
          ver edição
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
        <LanceCard template={t} serial={m.serial} live />

        <div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase"
            style={{ background: `${meta.color}26`, color: meta.color }}
          >
            {meta.label}
          </span>
          <h1 className="mt-2 font-display text-4xl uppercase text-ink">{t.player.name}</h1>
          <p className="text-muted">
            {t.title} · {t.playType} · {new Date(t.matchDate).toLocaleDateString('pt-BR')}
          </p>

          <div className="mt-4 font-mono text-2xl text-ink">{editionLabel(t, m.serial)}</div>
          {(t.parallel !== 'BASE' || t.badges.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.parallel !== 'BASE' && (
                <span className="rounded bg-panel2 px-2 py-0.5 text-xs text-ink">{t.parallel}</span>
              )}
              {t.badges.map((b) => (
                <span key={b} className="rounded bg-panel2 px-2 py-0.5 text-xs text-muted">
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
            {stat('Pontuação wefans', m.topShotScore.toLocaleString('pt-BR'))}
            {stat('Adquirido por', brl(m.acquiredPriceCents))}
            {stat('Preço médio (ASP)', brl(t.aspCents))}
            {stat('Dono', m.ownerUsername ? `@${m.ownerUsername}` : '—')}
          </div>
          <p className="mt-2 text-xs text-muted">Cunhado em {dateTime(m.mintedAt)}</p>

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Propriedade da edição
            </h2>
            <OwnershipStats existing={t.mintedCount} circulating={t.circulatingCount} burned={burned} />
          </div>
        </div>
      </div>
    </main>
  );
}
