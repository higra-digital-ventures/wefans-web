import Link from 'next/link';
import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import { brl, dateTime } from '@/lib/format';
import type { AdminMetrics, AuditEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [metrics, auditData] = await Promise.all([
    adminGet<AdminMetrics>('/admin/metrics'),
    adminGet<{ logs: AuditEntry[] }>('/admin/audit'),
  ]);
  if (!metrics) return <p className="text-muted">Falha ao carregar métricas.</p>;

  const cards = [
    { label: 'Usuários', value: String(metrics.users) },
    { label: 'Momentos (queimados)', value: `${metrics.moments.total} (${metrics.moments.burned})` },
    { label: 'Anúncios ativos', value: String(metrics.market.activeListings) },
    { label: 'Vendas', value: String(metrics.market.sales) },
    { label: 'Volume', value: brl(metrics.market.volumeCents) },
    { label: 'Taxas arrecadadas', value: brl(metrics.market.feesCents) },
    { label: 'Tx sinalizadas', value: String(metrics.market.flaggedTx) },
    { label: 'Fraude pendente', value: String(metrics.reviewPending) },
  ];

  return (
    <main>
      <h1 className="mb-6 font-display text-3xl uppercase text-ink">Painel</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-panel p-4">
            <div className="font-display text-2xl text-ink">{c.value}</div>
            <div className="mt-1 text-xs text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl mb-8 flex flex-wrap items-center gap-3  border border-line bg-panel p-4">
        <span className="text-sm text-muted">Operações:</span>
        <AdminAction path="/admin/cron/tick" label="Rodar cron agora" />
        {metrics.reviewPending > 0 && (
          <Link href="/admin/fraude" className="border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300">
            {metrics.reviewPending} check-in(s) em revisão →
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Auditoria (últimas ações)</h2>
        <div className="rounded-2xl border border-line bg-panel">
          {!auditData?.logs.length ? (
            <p className="px-4 py-6 text-sm text-muted">Sem registros ainda.</p>
          ) : (
            <ul className="divide-y divide-line/50">
              {auditData.logs.slice(0, 15).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="text-ink">
                    <span className="text-accent2">{l.action}</span>
                    {l.target && <span className="text-muted"> · {l.target.slice(0, 30)}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted">
                    @{l.by} · {dateTime(l.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
