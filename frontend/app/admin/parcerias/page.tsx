import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import AdminCreateTeam from '@/components/AdminCreateTeam';
import AdminRoyaltyConfig from '@/components/AdminRoyaltyConfig';
import { brl } from '@/lib/format';
import type { AdminTeam, PlatformConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PARTNER_COLOR: Record<string, string> = {
  ATIVO: 'text-emerald-300',
  PROSPECT: 'text-muted',
  PAUSADO: 'text-amber-300',
  ENCERRADO: 'text-accent',
};

export default async function AdminParcerias() {
  const [data, cfg] = await Promise.all([
    adminGet<{ teams: AdminTeam[] }>('/admin/teams'),
    adminGet<{ config: PlatformConfig }>('/admin/config'),
  ]);
  const teams = data?.teams ?? [];
  const config = cfg?.config ?? { platformFeeBps: 500, clubRoyaltyBps: 500, primaryClubBps: 3000 };
  const totalEarned = teams.reduce((s, t) => s + (t.earningsCents ?? 0), 0);

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Parcerias</h1>
      <p className="mb-6 text-sm text-muted">
        O time é a unidade de parceria: liberar publica o time e todo o conteúdo dele numa transação;
        pausar oculta das telas públicas sem apagar nada (seção 10.2).
      </p>

      <div className="mb-6">
        <AdminRoyaltyConfig initial={config} />
      </div>

      <div className="mb-6">
        <AdminCreateTeam />
      </div>

      <p className="mb-3 text-sm text-muted">
        Total acumulado em royalties dos times:{' '}
        <span className="font-bold text-accent3">{brl(totalEarned)}</span>
      </p>
      <div className="rounded-2xl border border-line bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Estádio</th>
              <th className="px-4 py-3">Parceria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Momentos</th>
              <th className="px-4 py-3 text-right">Ganhos (royalties)</th>
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
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-accent3">
                  {t.earningsCents > 0 ? brl(t.earningsCents) : '—'}
                </td>
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
