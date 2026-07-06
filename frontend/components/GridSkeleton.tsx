// Skeleton de grade (seção 11.11) — usado nos loading.tsx das telas com grid de cartas.
// `fullscreen` espelha o layout real do mercado/coleção/explorar (w-full + auto-fill 250px),
// para a troca skeleton → página não dar salto.
export default function GridSkeleton({ title, fullscreen = false }: { title: string; fullscreen?: boolean }) {
  return (
    <main className={fullscreen ? 'w-full px-4 py-7 lg:px-8' : 'mx-auto max-w-6xl px-6 py-12'}>
      <div className="mb-2 h-10 w-56 animate-pulse  bg-panel" aria-hidden />
      <p className="sr-only">Carregando {title}…</p>
      <div className="mb-4 h-4 w-32 animate-pulse  bg-panel" aria-hidden />
      {fullscreen && (
        <div className="mb-6 flex gap-2.5" aria-hidden>
          <div className="h-12 w-12 animate-pulse bg-panel" />
          <div className="h-12 flex-1 animate-pulse bg-panel" />
          <div className="h-12 w-40 animate-pulse bg-panel" />
        </div>
      )}
      <div
        className={
          fullscreen
            ? 'grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]'
            : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        }
      >
        {Array.from({ length: fullscreen ? 12 : 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl animate-pulse overflow-hidden  border border-line bg-panel" aria-hidden>
            <div className="aspect-[4/5] bg-panel2/60" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4  bg-panel2/60" />
              <div className="h-3 w-1/2  bg-panel2/60" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
