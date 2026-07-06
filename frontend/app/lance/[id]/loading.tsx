// Skeleton da página do Momento: mídia + painel de compra.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <p className="sr-only">Carregando Momento…</p>
      <div className="mb-5 flex gap-1.5" aria-hidden>
        {[80, 96, 72].map((w, i) => (
          <div key={i} className="h-6 animate-pulse bg-panel" style={{ width: w }} />
        ))}
      </div>
      <div className="grid gap-10 md:grid-cols-[minmax(0,380px)_1fr]" aria-hidden>
        <div className="aspect-square animate-pulse bg-panel" />
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse bg-panel" />
          <div className="h-12 w-3/4 animate-pulse bg-panel" />
          <div className="h-4 w-1/2 animate-pulse bg-panel" />
          <div className="rounded-2xl h-40 animate-pulse border border-line bg-panel" />
        </div>
      </div>
    </main>
  );
}
