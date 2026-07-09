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

const STATUSES = ['RASCUNHO', 'AGENDADO', 'PUBLICADO', 'ENCERRADO'];
const PAGE = 50;

export default async function AdminConteudo({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; p?: string }>;
}) {
  const { q, status, p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (status) qs.set('status', status);
  qs.set('p', String(page));
  const data = await adminGet<{ templates: AdminTemplate[]; total: number }>(`/admin/templates?${qs.toString()}`);
  const templates = data?.templates ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const pageLink = (n: number) => {
    const u = new URLSearchParams();
    if (q) u.set('q', q);
    if (status) u.set('status', status);
    u.set('p', String(n));
    return `/admin/conteudo?${u.toString()}`;
  };

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Conteúdo</h1>
      <p className="mb-4 text-sm text-muted">
        Ciclo de publicação (seção 10.1): RASCUNHO → AGENDADO (cron publica) → PUBLICADO → ENCERRADO.
        Nada nasce visível.
      </p>

      <form action="/admin/conteudo" className="mb-3 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por Momento ou jogador"
          className="rounded-lg w-full max-w-xs border border-white/15 bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-white/40"
        />
        <select name="status" defaultValue={status ?? ''} className="rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-ink">
          <option value="">Todos os status</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Filtrar</button>
      </form>
      <p className="mb-3 text-xs text-muted">{total} resultado(s)</p>

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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <a href={pageLink(page - 1)} className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-ink">
              ← Anterior
            </a>
          ) : (
            <span className="rounded-lg border border-line/40 px-3 py-1.5 text-neutral-600">← Anterior</span>
          )}
          <span className="text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <a href={pageLink(page + 1)} className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-ink">
              Próxima →
            </a>
          ) : (
            <span className="rounded-lg border border-line/40 px-3 py-1.5 text-neutral-600">Próxima →</span>
          )}
        </div>
      )}
    </main>
  );
}
