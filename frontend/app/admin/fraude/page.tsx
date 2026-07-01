import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import { dateTime } from '@/lib/format';
import type { FraudCheckin } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminFraude() {
  const data = await adminGet<{ checkins: FraudCheckin[] }>('/admin/checkins/review');
  const checkins = data?.checkins ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Fila de revisão de fraude</h1>
      <p className="mb-6 text-sm text-muted">
        Check-ins com sinais suspeitos (ex.: velocidade impossível) nunca ganham pacote automático —
        aprove ou rejeite manualmente (A2.2 item 8).
      </p>

      {checkins.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-muted">
          ✓ Fila vazia — nenhum check-in aguardando revisão.
        </div>
      ) : (
        <div className="space-y-3">
          {checkins.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-panel p-4">
              <div>
                <div className="text-ink">
                  @{c.username} · {c.fixture.home} x {c.fixture.away}{' '}
                  <span className="text-muted">({c.fixture.stadium})</span>
                </div>
                <div className="text-xs text-muted">
                  motivo: <span className="text-amber-300">{c.reason ?? '—'}</span> · ({c.lat.toFixed(4)},{' '}
                  {c.lng.toFixed(4)}) ±{c.accuracyM}m · {dateTime(c.createdAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <AdminAction path={`/admin/checkins/${c.id}/resolve`} body={{ approve: true }} label="✓ Aprovar (dá o pacote)" variant="primary" />
                <AdminAction path={`/admin/checkins/${c.id}/resolve`} body={{ approve: false }} label="✕ Rejeitar" variant="danger" />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
