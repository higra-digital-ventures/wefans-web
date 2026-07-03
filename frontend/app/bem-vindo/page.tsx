import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api-server';
import { brl } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Tour de boas-vindas do novo colecionador: 3 passos que ensinam o loop do produto
// (saldo → abrir pacote → coleção/mercado) no primeiro minuto.
export default async function BemVindoPage() {
  const me = await getMe();
  if (!me) redirect('/entrar');

  const STEPS = [
    {
      n: '1',
      color: '#21d4e0',
      title: `Você ganhou ${brl(me.balanceCents)}`,
      body: 'Saldo de boas-vindas em moeda de teste — nenhum dinheiro real. Use para abrir pacotes e negociar no mercado à vontade.',
      cta: { label: 'Ver minha carteira', href: '/perfil' },
    },
    {
      n: '2',
      color: '#ff2e88',
      title: 'Abra seu primeiro pacote',
      body: 'Cada pacote revela 3 Lances numerados — jogadas de futebol colecionáveis, com raridades de Comum a Galáctico. É aqui que tudo começa.',
      cta: { label: 'Abrir um pacote', href: '/pacotes' },
    },
    {
      n: '3',
      color: '#9d4edd',
      title: 'Colecione, negocie e jogue',
      body: 'Seus Lances valem pontos, entram em desafios, rankings e no fantasy Matchday — e podem ser vendidos no mercado a qualquer momento.',
      cta: { label: 'Explorar o mercado', href: '/mercado' },
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent3">Bem-vindo ao wefans</p>
      <h1 className="mt-2 font-display text-5xl uppercase leading-[0.95] text-ink">
        Fala, @{me.username}!
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Três passos para entrar em campo — leva menos de um minuto.
      </p>

      <div className="mt-8 space-y-4">
        {STEPS.map((s) => (
          <section key={s.n} className="flex gap-4 border border-line bg-panel p-5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center font-display text-xl text-white"
              style={{ background: `${s.color}33`, border: `1px solid ${s.color}66` }}
              aria-hidden
            >
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl uppercase text-ink">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              <Link
                href={s.cta.href}
                className="mt-3 inline-block border border-white/25 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/10"
              >
                {s.cta.label} →
              </Link>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        <p className="text-xs text-muted">
          Dúvidas sobre termos? Veja o{' '}
          <Link href="/como-funciona" className="text-accent3 underline">guia Como funciona</Link>.
        </p>
        <Link href="/pacotes" className="bg-accent px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90">
          Começar agora
        </Link>
      </div>
    </main>
  );
}
