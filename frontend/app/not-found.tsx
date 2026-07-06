import Link from 'next/link';

// 404 com a cara do produto — orienta em vez de assustar.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <p className="font-display text-[80px] uppercase leading-none text-white/10">404</p>
      <h1 className="mt-2 font-display text-3xl uppercase text-ink">Esse lance saiu de campo</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        A página que você procura não existe ou foi movida — pode ter sido vendida, queimada
        ou nunca ter sido criada. Se está perdido, o{' '}
        <Link href="/como-funciona" className="text-accent3 underline">guia rápido</Link> ajuda.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/mercado"
          className="rounded-lg bg-accent px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          Ir ao mercado
        </Link>
        <Link
          href="/colecao"
          className="border border-white/25 px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
        >
          Minha coleção
        </Link>
        <Link
          href="/explorar"
          className="border border-white/25 px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
        >
          Ver o que está rolando
        </Link>
      </div>
    </main>
  );
}
