import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import AdminCreateTeam from '@/components/AdminCreateTeam';
import type { AdminTeam } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PARTNER_COLOR: Record<string, string> = {
  ATIVO: 'text-emerald-300',
  PROSPECT: 'text-muted',
  PAUSADO: 'text-amber-300',
  ENCERRADO: 'text-accent',
};

export default async function AdminParcerias() {
  const data = await adminGet<{ teams: AdminTeam[] }>('/admin/teams');
  const teams = data?.teams ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Parcerias</h1>
      <p className="mb-6 text-sm text-muted">
        O time é a unidade de parceria: liberar publica o time e todo o conteúdo dele numa transação;
        pausar oculta das telas públicas sem apagar nada (seção 10.2).
      </p>

      <div className="mb-6">
        <AdminCreateTeam />
      </div>

      <div className="rounded-2xl border border-line bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Estádio</th>
              <th className="px-4 py-3">Parceria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lances</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-b border-line/50 last:border-0">
                <td className="px-4 py-2.5 text-ink">{t.name}</td>
                <td className="px-4 py-2.5 text-muted">
                  {t.stadium ? `${t.stadium.name} · ${t.stadium.city}` : '—'}
                </td>
                <td className={`px-4 py-2.5 ${PARTNER_COLOR[t.partnerStatus] ?? 'text-muted'}`}>{t.partnerStatus}</td>
                <td className="px-4 py-2.5 text-muted">{t.status}</td>
                <td className="px-4 py-2.5 text-muted">{t.templateCount}</td>
                <td className="px-4 py-2.5 text-right">
                  {t.status !== 'PUBLICADO' ? (
                    <AdminAction
                      path={`/admin/teams/${t.id}/release`}
                      label="🔓 Liberar parceria"
                      variant="primary"
                      confirmText={`Publicar ${t.name} e todo o conteúdo dele?`}
                    />
                  ) : (
                    <AdminAction
                      path={`/admin/teams/${t.id}/pause`}
                      label="⏸ Pausar"
                      variant="danger"
                      confirmText={`Ocultar o conteúdo de ${t.name} das telas públicas?`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
