import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getActiveFixturesServer, getCheckinHistoryServer, getMe } from '@/lib/api-server';
import CheckinPanel from '@/components/CheckinPanel';

export const dynamic = 'force-dynamic';

export default async function CheckinPage() {
  const me = await getMe();
  if (!me) redirect('/entrar');

  const [fixtures, history] = await Promise.all([
    getActiveFixturesServer(),
    getCheckinHistoryServer(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Check-in</h1>
      <p className="mb-4 text-muted">
        Prova de presença: no estádio do seu time, em dia de jogo, ganhe um pacote.
      </p>
      <div className="rounded-lg mb-6  border border-line bg-panel2 px-4 py-3 text-xs text-muted">
        No app (Flutter) isto usa o GPS real e a atestação de dispositivo (Play Integrity /
        App Attest). Aqui na web é um <span className="text-ink">simulador</span>: “no estádio”
        envia as coordenadas do estádio; “longe” envia coordenadas fora do raio. A validação
        (janela, geofence, mock, nonce, unicidade) é 100% no servidor.
      </div>

      {!me.favoriteTeam ? (
        <div className="rounded-2xl border border-line bg-panel p-6 text-center">
          <p className="mb-3 text-muted">Escolha um time seguido para participar do check-in.</p>
          <Link href="/perfil" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
            Escolher time no perfil
          </Link>
        </div>
      ) : fixtures && fixtures.length > 0 ? (
        <div className="space-y-4">
          {fixtures.map((f) => (
            <CheckinPanel key={f.id} fixture={f} />
          ))}
        </div>
      ) : (
        <p className="text-muted">
          Nenhum jogo do <span className="text-ink">{me.favoriteTeam.name}</span> com janela de
          check-in aberta agora.
        </p>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Histórico</h2>
          <ul className="rounded-2xl divide-y divide-line  border border-line bg-panel">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="text-ink">
                    {h.fixture.home} x {h.fixture.away}
                  </span>{' '}
                  <span className="text-muted">· {h.fixture.stadium}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      h.status === 'VALID'
                        ? 'text-emerald-300'
                        : h.status === 'REVIEW'
                          ? 'text-amber-300'
                          : 'text-muted'
                    }
                  >
                    {h.status}
                  </span>
                  {h.grantedPackInventoryId && (
                    <Link href={`/abrir/${h.grantedPackInventoryId}`} className="text-accent3 hover:underline">
                      abrir pacote
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
