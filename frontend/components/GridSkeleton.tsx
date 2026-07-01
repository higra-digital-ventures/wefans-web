// Skeleton de grade (seção 11.11) — usado nos loading.tsx das telas com grid de cartas.
export default function GridSkeleton({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-2 h-10 w-56 animate-pulse rounded-lg bg-panel" aria-hidden />
      <p className="sr-only">Carregando {title}…</p>
      <div className="mb-8 h-4 w-32 animate-pulse rounded bg-panel" aria-hidden />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-panel" aria-hidden>
            <div className="aspect-[4/5] bg-panel2/60" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 rounded bg-panel2/60" />
              <div className="h-3 w-1/2 rounded bg-panel2/60" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
