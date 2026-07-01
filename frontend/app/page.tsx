import Link from 'next/link';
import { getHealth, getSystemStats, type Health, type SystemStats } from '@/lib/api';
import { getActivityServer } from '@/lib/api-server';
import ActivityFeed from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

const STAT_LABELS: Record<keyof SystemStats['stats'], string> = {
  templates: 'Lances (templates)',
  moments: 'Momentos cunhados',
  packs: 'Pacotes',
  drops: 'Drops',
  players: 'Jogadores',
  teams: 'Times',
  stadiums: 'Estádios',
  fixtures: 'Jogos',
  challenges: 'Desafios',
  sets: 'Coleções',
  series: 'Temporadas',
  users: 'Usuários',
};

export default async function Home() {
  let health: Health | null = null;
  let stats: SystemStats['stats'] | null = null;
  let error: string | null = null;

  try {
    const [h, s] = await Promise.all([getHealth(), getSystemStats()]);
    health = h;
    stats = s.stats;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Falha ao conectar na API';
  }

  const activity = error ? [] : await getActivityServer(10).catch(() => []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero */}
      <header className="mb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs uppercase tracking-widest text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent3" /> Beta · Fase 0
        </span>
        <h1 className="mt-4 bg-sunset bg-clip-text font-display text-6xl font-black uppercase tracking-tight text-transparent sm:text-7xl">
          wefans
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted">
          Momentos de futebol colecionáveis. Fundação <span className="text-ink">API-first</span> no ar —
          backend, banco e catálogo semeado conversando com a web.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pacotes"
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Abrir pacotes
          </Link>
          <Link
            href="/explorar"
            className="rounded-lg border border-line px-5 py-2.5 text-ink transition-colors hover:border-accent/40"
          >
            Explorar catálogo
          </Link>
        </div>
      </header>

      {/* Status da API */}
      <section
        className={`mb-8 flex items-center justify-between rounded-2xl border p-5 ${
          error ? 'border-accent/40 bg-accent/5' : 'border-line bg-panel'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${error ? 'bg-accent' : 'bg-emerald-400'}`}
            style={{ boxShadow: error ? '0 0 12px #ff2e88' : '0 0 12px #34d399' }}
          />
          <div>
            <p className="font-medium text-ink">
              {error ? 'API indisponível' : `API ${health?.service} · ${health?.version}`}
            </p>
            <p className="font-mono text-xs text-muted">
              {error ? error : `ok · ${health ? new Date(health.time).toLocaleString('pt-BR') : ''}`}
            </p>
          </div>
        </div>
        <code className="hidden rounded-lg bg-panel2 px-3 py-1.5 font-mono text-xs text-muted sm:block">
          GET /api/v1/health
        </code>
      </section>

      {error ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-muted">
          <p className="mb-2 font-medium text-ink">O backend não respondeu.</p>
          <p className="text-sm">
            Rode <code className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-accent3">npm run dev</code> na raiz
            (ou <code className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-accent3">./dev.sh</code>) para subir
            a API em <span className="font-mono">:4000</span> e a web em <span className="font-mono">:3000</span>.
          </p>
        </div>
      ) : (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
            Catálogo semeado (via <span className="font-mono lowercase text-accent3">/api/v1/system/stats</span>)
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stats &&
              (Object.keys(STAT_LABELS) as (keyof SystemStats['stats'])[]).map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-line bg-panel p-4 transition-colors hover:border-accent/40"
                >
                  <div className="font-display text-3xl text-ink">{stats![key]}</div>
                  <div className="mt-1 text-xs text-muted">{STAT_LABELS[key]}</div>
                </div>
              ))}
          </div>
        </section>
      )}

      {!error && activity.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
              Vendas ao vivo no Mercado
            </h2>
            <Link href="/mercado/atividade" className="text-sm text-accent3 hover:underline">
              ver tudo →
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-3">
            <ActivityFeed initial={activity} limit={10} />
          </div>
        </section>
      )}

      <footer className="mt-16 border-t border-line pt-6 text-xs text-muted">
        Conteúdo 100% fictício · sem marcas/imagens reais (ver{' '}
        <span className="font-mono">.claude/LEGAL.md</span>). <span className="text-ink">MVP + Ofertas/Desafios</span>{' '}
        no ar. Próximo (v2): Drops com fila, Vitrines, Missões, Rankings, Pelada.
      </footer>
    </main>
  );
}
