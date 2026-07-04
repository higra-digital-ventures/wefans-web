import Link from 'next/link';
import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import { brl, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

type FlaggedTx = {
  id: string;
  type: string;
  amountCents: number;
  aspCents: number;
  title: string;
  momentId: string;
  buyer: string | null;
  seller: string | null;
  createdAt: string;
};

export default async function AdminConduta() {
  const data = await adminGet<{ transactions: FlaggedTx[] }>('/admin/transactions/flagged');
  const txs = data?.transactions ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Conduta — transações sinalizadas</h1>
      <p className="mb-6 text-sm text-muted">
        Vendas com preço &gt; 3× o ASP da edição (possível wash trading). Revise e marque como resolvida.
      </p>

      {txs.length === 0 ? (
        <div className="border border-line bg-panel p-8 text-center text-muted">
          ✓ Nenhuma transação aguardando revisão.
        </div>
      ) : (
        <div className="space-y-3">
          {txs.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3  border border-accent/30 bg-panel p-4">
              <div>
                <div className="text-ink">
                  <Link href={`/momento/${t.momentId}`} className="hover:text-accent">
                    {t.title}
                  </Link>{' '}
                  <span className="tabular-nums text-accent">{brl(t.amountCents)}</span>
                  <span className="text-muted"> (ASP {brl(t.aspCents)})</span>
                </div>
                <div className="text-xs text-muted">
                  {t.seller && `@${t.seller} → `}
                  {t.buyer && `@${t.buyer}`} · {t.type} · {dateTime(t.createdAt)}
                </div>
              </div>
              <AdminAction path={`/admin/transactions/${t.id}/resolve`} label="✓ Marcar como revisada" variant="primary" />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
