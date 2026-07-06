'use client';

import { useToast } from '@/components/Toaster';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buyPackListing, cancelPackListing, listPack } from '@/lib/api-client';
import { brl } from '@/lib/format';
import type { MyPack, PackListingDTO } from '@/lib/types';

export default function PackMarketClient({
  listings,
  myPacks,
  isAuthed,
}: {
  listings: PackListingDTO[];
  myPacks: MyPack[] | null;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<unknown>, ok?: string) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        if (ok) toast(ok, 'success');
        router.refresh();
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Erro';
        if (/autenticad|401/i.test(m)) router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        else setError(m);
      }
    });
  };

  const primary = ' bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';
  const ghost = ' border border-line px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-50';

  return (
    <div className="space-y-10">
      {error && <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Pacotes lacrados à venda</h2>
        {listings.length === 0 ? (
          <p className="text-muted">Nenhum pacote lacrado à venda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <div key={l.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="font-semibold text-ink">{l.pack.name}</div>
                <div className="text-xs text-muted">
                  {l.pack.momentCount} Lances · vendedor @{l.seller}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="tabular-nums text-accent3">{brl(l.priceCents)}</span>
                  <button className={primary} disabled={pending} onClick={() => run(() => buyPackListing(l.id), 'Pacote comprado — está no seu estoque.')}>
                    Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {myPacks && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Meus pacotes lacrados</h2>
          {myPacks.length === 0 ? (
            <p className="text-muted">Você não tem pacotes lacrados.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myPacks.map((p) => (
                <div key={p.id} className="rounded-2xl border border-line bg-panel p-5">
                  <div className="font-semibold text-ink">{p.pack.name}</div>
                  <div className="text-xs text-muted">{p.pack.momentCount} Lances</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={`/abrir/${p.id}`} className={ghost}>
                      Abrir
                    </Link>
                    {p.listed ? (
                      <>
                        <span className="tabular-nums text-sm text-accent3">{brl(p.priceCents ?? 0)}</span>
                        <button className={ghost} disabled={pending} onClick={() => run(() => cancelPackListing(p.listingId!), 'Anúncio cancelado.')}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg flex items-center  border border-line bg-panel2 px-2">
                          <span className="text-muted">R$</span>
                          <input
                            type="number"
                            min={1}
                            value={prices[p.id] ?? ''}
                            onChange={(e) => setPrices((s) => ({ ...s, [p.id]: e.target.value }))}
                            className="w-16 bg-transparent px-1 py-1 text-ink outline-none"
                            placeholder="0"
                          />
                        </div>
                        <button
                          className={primary}
                          disabled={pending || !prices[p.id]}
                          onClick={() => run(() => listPack(p.id, Math.round(Number(prices[p.id]) * 100)), 'Pacote anunciado no mercado.')}
                        >
                          Vender
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
