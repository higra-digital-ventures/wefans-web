import { adminGet } from '@/lib/api-server';
import { dateTime } from '@/lib/format';
import type { AdminFixture } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminJogos() {
  const data = await adminGet<{ fixtures: AdminFixture[] }>('/admin/fixtures');
  const fixtures = data?.fixtures ?? [];

  return (
    <main>
      <h1 className="mb-2 font-display text-3xl uppercase text-ink">Jogos (check-in)</h1>
      <p className="mb-6 text-sm text-muted">
        Cada jogo define a janela de check-in (2h antes → 3h depois do apito) e o pacote-prêmio.
      </p>

      <div className="border border-line bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Jogo</th>
              <th className="px-4 py-3">Estádio</th>
              <th className="px-4 py-3">Apito</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Check-ins</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => (
              <tr key={f.id} className="border-b border-line/50 last:border-0">
                <td className="px-4 py-2.5 text-ink">
                  {f.home} <span className="text-muted">x</span> {f.away}
                </td>
                <td className="px-4 py-2.5 text-muted">{f.stadium}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted">{dateTime(f.kickoffAt)}</td>
                <td className="px-4 py-2.5 text-muted">{f.status}</td>
                <td className="px-4 py-2.5 text-right font-mono text-accent3">{f.checkins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
