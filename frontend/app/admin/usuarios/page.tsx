import { adminGet } from '@/lib/api-server';
import AdminUserActions from '@/components/AdminUserActions';
import { brl, dateTime } from '@/lib/format';
import type { AdminUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminUsuarios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const data = await adminGet<{ users: AdminUser[] }>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const users = data?.users ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Usuários</h1>
      <p className="mb-4 text-sm text-muted">
        Buscar, suspender (bloqueia login) e ajustar saldo de teste. Mostra os 50 mais recentes.
      </p>

      <form action="/admin/usuarios" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por usuário ou e-mail"
          className="rounded-lg w-full max-w-sm border border-white/15 bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-white/40"
        />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Buscar</button>
      </form>

      <div className="rounded-2xl border border-line bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Momentos</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={6}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/50 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="text-ink">
                    @{u.username}
                    {u.isAdmin && <span className="ml-2 text-[10px] text-accent2">admin</span>}
                  </div>
                  <div className="text-[11px] text-muted">{u.email}</div>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-muted">{brl(u.balanceCents)}</td>
                <td className="px-4 py-2.5 text-muted">{u.momentCount}</td>
                <td className="px-4 py-2.5 text-muted">{dateTime(u.createdAt).split(',')[0]}</td>
                <td className={`px-4 py-2.5 ${u.suspended ? 'text-accent' : 'text-emerald-300'}`}>
                  {u.suspended ? 'Suspenso' : 'Ativo'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <AdminUserActions id={u.id} suspended={u.suspended} isAdmin={u.isAdmin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
