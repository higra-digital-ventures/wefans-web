import { brl } from '@/lib/format';
import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import { TIER_META } from '@/lib/tiers';
import type { AdminTemplate, Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  PUBLICADO: 'text-emerald-300',
  RASCUNHO: 'text-muted',
  AGENDADO: 'text-amber-300',
  ENCERRADO: 'text-accent',
};

export default async function AdminConteudo() {
  const data = await adminGet<{ templates: AdminTemplate[] }>('/admin/templates');
  const templates = data?.templates ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Conteúdo</h1>
      <p className="mb-6 text-sm text-muted">
        Ciclo de publicação (seção 10.1): RASCUNHO → AGENDADO (cron publica) → PUBLICADO → ENCERRADO.
        Nada nasce visível.
      </p>

      <div className="rounded-2xl overflow-x-auto  border border-line bg-panel">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Momento</th>
              <th className="px-4 py-3">Jogador · Time</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Edição</th>
              <th className="px-4 py-3 text-right" title="anúncio mais barato ativo">Floor</th>
              <th className="px-4 py-3 text-right" title="preço médio das últimas vendas">Média</th>
              <th className="px-4 py-3 text-right" title="anúncios ativos">À venda</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-line/50 last:border-0">
                <td className="max-w-[220px] truncate px-4 py-2 text-ink">{t.title}</td>
                <td className="px-4 py-2 text-muted">
                  {t.player}
                  {t.team && <span className="text-muted/60"> · {t.team}</span>}
                </td>
                <td className="px-4 py-2">
                  <span style={{ color: TIER_META[t.tier as Tier]?.color }}>{t.tier}</span>
                </td>
                <td className="px-4 py-2 tabular-nums text-xs text-muted">
                  {t.editionType === 'LIMITADA' ? `${t.mintedCount}/${t.editionSize}` : `CC · ${t.mintedCount}`}
                </td>
                <td
                  className={`px-4 py-2 text-right tabular-nums text-xs ${
                    t.floorCents != null && t.aspCents > 0 && t.floorCents < t.aspCents * 0.5
                      ? 'font-bold text-red-400'
                      : 'text-muted'
                  }`}
                  title={
                    t.floorCents != null && t.aspCents > 0 && t.floorCents < t.aspCents * 0.5
                      ? 'floor abaixo de metade da média — sinal de excesso de oferta; segure a emissão'
                      : undefined
                  }
                >
                  {t.floorCents != null ? brl(t.floorCents) : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-xs text-muted">
                  {t.aspCents > 0 ? brl(t.aspCents) : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-xs text-muted">{t.activeListings}</td>
                <td className={`px-4 py-2 ${STATUS_COLOR[t.status] ?? 'text-muted'}`}>{t.status}</td>
                <td className="space-x-1 px-4 py-2 text-right">
                  {t.status !== 'PUBLICADO' && (
                    <AdminAction path={`/admin/content/template/${t.id}/status`} body={{ action: 'publish' }} label="Publicar" variant="primary" />
                  )}
                  {t.status === 'PUBLICADO' && (
                    <AdminAction path={`/admin/content/template/${t.id}/status`} body={{ action: 'end' }} label="Encerrar emissão" variant="danger" confirmText="Encerrar a emissão desta edição? Congela o supply — não sai mais em packs." />
                  )}
                  {t.status !== 'RASCUNHO' && t.status !== 'PUBLICADO' && (
                    <AdminAction path={`/admin/content/template/${t.id}/status`} body={{ action: 'draft' }} label="Rascunho" />
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
