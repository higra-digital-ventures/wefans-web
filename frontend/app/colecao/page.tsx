import Icon from '@/components/Icon';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getChecklistsServer, getCollectionServer } from '@/lib/api-server';
import CountUp from '@/components/CountUp';
import MomentCard from '@/components/MomentCard';
import EmptyState from '@/components/EmptyState';
import SortDropdown from '@/components/SortDropdown';
import Term from '@/components/Term';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';
import { brl } from '@/lib/format';
import type { MomentDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ColecaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; all?: string; q?: string; venda?: string; sort?: string }>;
}) {
  const { tier, all, q, venda, sort } = await searchParams;
  const [momentsRaw, checklists] = await Promise.all([
    getCollectionServer(tier ? `?tier=${tier}` : ''),
    getChecklistsServer().catch(() => []),
  ]);
  let moments = momentsRaw;
  if (moments === null) redirect('/entrar');

  // paridade com os filtros do mercado: busca por texto e "só à venda"
  if (q) {
    const needle = q.toLowerCase();
    moments = moments.filter(
      (m) =>
        m.template.player.name.toLowerCase().includes(needle) ||
        m.template.title.toLowerCase().includes(needle) ||
        m.template.player.club.toLowerCase().includes(needle),
    );
  }
  if (venda) moments = moments.filter((m) => m.listingPriceCents != null);

  // ordenação da coleção (valor pela média, raridade, serial baixo, recente)
  if (sort === 'valor') moments = [...moments].sort((a, b) => (b.template.aspCents || 0) - (a.template.aspCents || 0));
  else if (sort === 'raridade')
    moments = [...moments].sort((a, b) => TIER_ORDER.indexOf(a.template.tier) - TIER_ORDER.indexOf(b.template.tier));
  else if (sort === 'serial') moments = [...moments].sort((a, b) => a.serial - b.serial);

  // agrupa duplicatas por edição (padrão); representante = menor serial
  const groups = new Map<string, MomentDTO[]>();
  for (const m of moments) {
    const g = groups.get(m.template.id);
    if (g) g.push(m);
    else groups.set(m.template.id, [m]);
  }
  const grouped = [...groups.values()].map((g) => [...g].sort((a, b) => a.serial - b.serial));
  const showAll = all === '1' || grouped.every((g) => g.length === 1);
  const hasDupes = grouped.some((g) => g.length > 1);
  // valor estimado = soma do preço médio (ASP) das edições que você possui
  const estimatedCents = moments.reduce((sum, m) => sum + (m.template.aspCents || 0), 0);
  const investedCents = moments.reduce((sum, m) => sum + (m.acquiredPriceCents || 0), 0);
  const deltaPct = investedCents > 0 ? Math.round(((estimatedCents - investedCents) / investedCents) * 100) : null;
  // contagem por tier (chips com número)
  const tierCounts = new Map<string, number>();
  for (const m of moments) tierCounts.set(m.template.tier, (tierCounts.get(m.template.tier) ?? 0) + 1);
  // checklists perto de completar (faixa do fim da página)
  const nearDone = checklists
    .filter((c) => c.progress && !c.claimed && c.progress.have > 0)
    .sort((a, b) => b.progress!.have / b.progress!.need - a.progress!.have / a.progress!.need)
    .slice(0, 2);

  return (
    <main className="w-full px-4 py-8 lg:px-8">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl uppercase text-ink">Minha Coleção</h1>
        {estimatedCents > 0 && (
          <div className="text-right" title="Soma do preço médio de venda (ASP) de cada Momento seu — estimativa, não cotação">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted">
              <Term id="precos">Valor estimado</Term> ⓘ
            </div>
            <div className="font-display text-2xl text-accent3">
              <CountUp value={estimatedCents} money />
            </div>
            {investedCents > 0 && deltaPct != null && (
              <div className="text-[11px] tabular-nums text-neutral-400">
                investido {brl(investedCents)} ·{' '}
                <span className={deltaPct >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>
                  {deltaPct >= 0 ? '+' : ''}
                  {deltaPct}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mb-6 text-muted">
        {moments.length} Momento{moments.length !== 1 ? 's' : ''} · {grouped.length} ediç
        {grouped.length !== 1 ? 'ões' : 'ão'}
        {hasDupes && (
          <>
            {' · '}
            <Link
              href={showAll && all === '1' ? (tier ? `/colecao?tier=${tier}` : '/colecao') : `/colecao?${tier ? `tier=${tier}&` : ''}all=1`}
              className="text-accent3 underline underline-offset-2 hover:text-ink"
            >
              {all === '1' ? 'agrupar duplicatas' : 'mostrar todos os exemplares'}
            </Link>
          </>
        )}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form action="/colecao" className="relative min-w-[220px] flex-1">
          {tier && <input type="hidden" name="tier" value={tier} />}
          {venda && <input type="hidden" name="venda" value={venda} />}
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Busque na sua coleção"
            className="rounded-lg h-10 w-full border border-white/25 bg-transparent pl-9 pr-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white"
          />
        </form>
        <SortDropdown
          options={[
            { v: 'recente', label: 'RECENTES' },
            { v: 'valor', label: 'MAIOR VALOR' },
            { v: 'raridade', label: 'RARIDADE' },
            { v: 'serial', label: 'MENOR SERIAL' },
          ]}
          current={sort ?? 'recente'}
        />
        <Link
          href={`/colecao?${new URLSearchParams({ ...(tier ? { tier } : {}), ...(q ? { q } : {}), ...(venda ? {} : { venda: '1' }) })}`}
          scroll={false}
          className={`rounded-full border px-3 py-2.5 lg:py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
            venda ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-white/40 text-white hover:bg-white/10'
          }`}
        >
          À venda
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Link
          href="/colecao"
          className={`rounded-full border px-3 py-2.5 lg:py-1 text-[11px] font-semibold uppercase tracking-wide ${
            !tier ? 'border-accent text-accent' : 'border-white/20 text-neutral-400 hover:text-white'
          }`}
        >
          Todos
        </Link>
        {TIER_ORDER.map((t) => {
          const n = tierCounts.get(t) ?? 0;
          return (
            <Link
              key={t}
              href={tier === t ? '/colecao' : `/colecao?tier=${t}`}
              scroll={false}
              className={`rounded-full border px-3 py-2.5 lg:py-1 text-[11px] font-semibold uppercase tracking-wide ${
                tier === t ? 'border-white text-white' : 'border-white/20 text-neutral-400 hover:text-white'
              }`}
              style={tier === t ? undefined : { color: n > 0 ? TIER_META[t].color : undefined }}
            >
              {TIER_META[t].label}
              {n > 0 && <span className="ml-1 tabular-nums text-neutral-400">({n})</span>}
            </Link>
          );
        })}
      </div>

      {moments.length === 0 ? (
        <EmptyState
          title={tier ? 'Nada deste tier ainda' : 'Sua coleção começa aqui'}
          hint="Abra um pacote e revele seus primeiros Momentos numerados."
          cta={{ label: 'Abrir um pacote', href: '/pacotes' }}
        />
      ) : showAll ? (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {moments.map((m) => (
            <MomentCard
              key={m.id}
              template={m.template}
              serial={m.serial}
              listingPriceCents={m.listingPriceCents}
              paidCents={m.acquiredPriceCents}
              href={`/momento/${m.id}#vender`}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {grouped.map((g) => {
            const m = g[0];
            return (
              <div key={m.template.id} className="relative">
                {g.length > 1 && (
                  <span
                    className="absolute left-2 top-2 z-10 bg-white px-1.5 py-0.5 text-[11px] font-bold text-black"
                    title={`Você tem ${g.length} exemplares desta edição (seriais ${g.map((x) => `#${x.serial}`).join(', ')})`}
                  >
                    ×{g.length}
                  </span>
                )}
                <MomentCard
                  template={m.template}
                  serial={m.serial}
                  listingPriceCents={m.listingPriceCents}
                  paidCents={m.acquiredPriceCents}
                  href={`/momento/${m.id}#vender`}
                />
              </div>
            );
          })}
        </div>
      )}

      {nearDone.length > 0 && (
        <section className="rounded-2xl mt-10 border border-white/10 bg-[#0a0a0b] p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl uppercase text-ink">Perto de completar</h2>
            <Link href="/jogar/checklists" className="text-[11px] text-neutral-400 underline underline-offset-2 hover:text-white">
              ver checklists
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {nearDone.map((c) => (
              <Link key={c.id} href="/jogar/checklists" className="block">
                <div className="mb-1 flex items-baseline justify-between text-[12px]">
                  <span className="truncate font-semibold text-neutral-200">{c.name}</span>
                  <span className="shrink-0 tabular-nums text-[11px] text-neutral-500">
                    {c.progress!.have}/{c.progress!.need}
                  </span>
                </div>
                <div className="h-1 bg-white/10">
                  <div
                    className="h-1 bg-accent3"
                    style={{ width: `${(c.progress!.have / c.progress!.need) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
