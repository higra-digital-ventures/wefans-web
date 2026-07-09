import { Fragment } from 'react';
import { adminGet } from '@/lib/api-server';
import AdminAction from '@/components/AdminAction';
import AdminCreateDrop from '@/components/AdminCreateDrop';
import AdminCreatePack from '@/components/AdminCreatePack';
import { TIER_META } from '@/lib/tiers';
import { brl, dateTime } from '@/lib/format';
import type { AdminDrop, AdminPack, AdminSet, Tier } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  LIVE: 'text-emerald-300',
  WAITING: 'text-amber-300',
  SCHEDULED: 'text-muted',
  ENDED: 'text-neutral-500',
};

export default async function AdminDropsPage() {
  const [d, p, s] = await Promise.all([
    adminGet<{ drops: AdminDrop[] }>('/admin/drops'),
    adminGet<{ packs: AdminPack[] }>('/admin/packs'),
    adminGet<{ sets: AdminSet[] }>('/admin/sets'),
  ]);
  const drops = d?.drops ?? [];
  const packs = p?.packs ?? [];
  const sets = s?.sets ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Drops &amp; Packs</h1>
      <p className="mb-6 text-sm text-muted">
        Monte lançamentos (com fila/janela) e pacotes (odds, garantia, coleção). O drop abre e inicia
        sozinho nos horários; packs sem drop ficam na Loja 24/7.
      </p>

      {/* ---- DROPS ---- */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl uppercase text-ink">Drops</h2>
        <div className="mb-4">
          <AdminCreateDrop />
        </div>
        <div className="rounded-2xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Packs</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {drops.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-muted" colSpan={6}>
                    Nenhum drop ainda.
                  </td>
                </tr>
              )}
              {drops.map((dr) => {
                const editable = dr.status === 'SCHEDULED' || dr.status === 'WAITING';
                return (
                  <Fragment key={dr.id}>
                    <tr className="border-b border-line/50">
                      <td className="px-4 py-2.5 text-ink">
                        {dr.name}
                        {dr.hasRebound && <span className="ml-2 text-[10px] text-accent3">rebound</span>}
                      </td>
                      <td className={`px-4 py-2.5 ${STATUS_COLOR[dr.status] ?? 'text-muted'}`}>{dr.status}</td>
                      <td className="px-4 py-2.5 text-muted">{dateTime(dr.startsAt)}</td>
                      <td className="px-4 py-2.5 text-muted">{dr.requiredCollectorScore || '—'}</td>
                      <td className="px-4 py-2.5 text-muted">{dr.packCount}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {editable && (
                            <AdminAction
                              path={`/admin/drops/${dr.id}/start`}
                              label="Iniciar agora"
                              variant="primary"
                              confirmText={`Iniciar "${dr.name}" agora (sorteia a fila)?`}
                            />
                          )}
                          {dr.status !== 'ENDED' && (
                            <AdminAction
                              path={`/admin/drops/${dr.id}/cancel`}
                              label="Cancelar"
                              variant="danger"
                              confirmText={`Cancelar "${dr.name}"?`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                    {editable && (
                      <tr className="border-b border-line/50">
                        <td colSpan={6} className="px-4 pb-4">
                          <details>
                            <summary className="cursor-pointer text-xs text-muted hover:text-ink">Editar drop</summary>
                            <div className="pt-3">
                              <AdminCreateDrop initial={dr} />
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- PACKS ---- */}
      <section>
        <h2 className="mb-3 font-display text-xl uppercase text-ink">Packs</h2>
        <div className="mb-4">
          <AdminCreatePack sets={sets} drops={drops} />
        </div>
        <div className="rounded-2xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Momentos</th>
                <th className="px-4 py-3">Supply</th>
                <th className="px-4 py-3">Garantia</th>
                <th className="px-4 py-3">Coleção</th>
                <th className="px-4 py-3">Onde</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pk) => (
                <Fragment key={pk.id}>
                  <tr className="border-b border-line/50">
                    <td className="px-4 py-2.5 text-ink">
                      {pk.name}
                      {pk.ticketOnly && <span className="ml-2 text-[10px] text-accent2">fichas</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{pk.priceCents > 0 ? brl(pk.priceCents) : 'Grátis'}</td>
                    <td className="px-4 py-2.5 text-muted">{pk.momentCount}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {pk.soldCount.toLocaleString('pt-BR')}/{pk.totalSupply.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5">
                      {pk.guaranteeTier ? (
                        <span style={{ color: TIER_META[pk.guaranteeTier as Tier].color }}>
                          {TIER_META[pk.guaranteeTier as Tier].label}+
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{pk.setName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{pk.dropName ? `Drop: ${pk.dropName}` : 'Loja 24/7'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {pk.totalSupply > pk.soldCount && (
                          <AdminAction
                            path={`/admin/packs/${pk.id}/offsale`}
                            label="Tirar de venda"
                            variant="danger"
                            confirmText={`Tirar "${pk.name}" de venda (congela o supply no já vendido)?`}
                          />
                        )}
                        {pk.soldCount === 0 && (
                          <AdminAction
                            path={`/admin/packs/${pk.id}/delete`}
                            label="Apagar"
                            variant="danger"
                            confirmText={`Apagar "${pk.name}"?`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td colSpan={8} className="px-4 pb-4">
                      <details>
                        <summary className="cursor-pointer text-xs text-muted hover:text-ink">Editar pack</summary>
                        <div className="pt-3">
                          <AdminCreatePack sets={sets} drops={drops} initial={pk} />
                        </div>
                      </details>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
