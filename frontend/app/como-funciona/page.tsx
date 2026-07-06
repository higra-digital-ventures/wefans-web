import Link from 'next/link';
import { TIER_META, TIER_ORDER } from '@/lib/tiers';

// Glossário do produto — cada termo que aparece nos cards e páginas, explicado
// em linguagem de torcedor. Linkado do footer, do tour e da 404.
export const metadata = { title: 'Como funciona — wefans' };

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: 'lances',
    title: 'O que é um Momento?',
    body: (
      <>
        Um <strong>Momento</strong> é uma jogada de futebol colecionável — golaço, defesa, drible,
        falta — emitida como exemplar <strong>numerado</strong> (#serial). A mesma jogada pode ter
        vários exemplares (a <em>edição</em>), mas cada número é único e tem dono. Números baixos
        (#1, #2…) e o número da camisa do jogador valem mais para colecionadores.
      </>
    ),
  },
  {
    id: 'raridades',
    title: 'Raridades (tiers)',
    body: (
      <>
        Toda edição nasce com uma raridade, do mais comum ao mais raro:{' '}
        {TIER_ORDER.slice()
          .reverse()
          .map((t, i) => (
            <span key={t}>
              {i > 0 && ' → '}
              <strong style={{ color: TIER_META[t].color }}>{TIER_META[t].label}</strong>
            </span>
          ))}
        . Quanto mais raro, menos exemplares existem — Galácticos têm pouquíssimos exemplares no mundo.
      </>
    ),
  },
  {
    id: 'edicoes',
    title: 'Limitada e Aberta (quantos existem)',
    body: (
      <>
        <strong>Limitada (LE)</strong>: a quantidade é fixa — "/45" significa que só 45
        exemplares existirão, nunca mais. <strong>Aberta</strong>: novos exemplares ainda
        podem ser criados em pacotes; o número mostrado é quantos circulam hoje.{' '}
        <strong>Burned</strong> são exemplares queimados para sempre;{' '}
        <strong>Supply</strong> é o que restou em circulação.
      </>
    ),
  },
  {
    id: 'precos',
    title: 'Menor preço e Média',
    body: (
      <>
        <strong>Menor preço</strong> é o anúncio mais barato da edição à venda agora (o "floor").{' '}
        <strong>Média</strong> é o preço médio das últimas vendas. A plataforma cobra{' '}
        <strong>5% de taxa</strong> do vendedor em cada venda. Compras muito acima da média (3×+)
        são sinalizadas para revisão de conduta.
      </>
    ),
  },
  {
    id: 'scores',
    title: 'Os dois scores',
    body: (
      <>
        <strong>Pontuação wefans</strong>: valor da sua coleção em pontos — cada Momento vale
        conforme o preço pago ou a média (o que for maior), então ela sobe e desce com o mercado.{' '}
        <strong>Score do Colecionador</strong>: pontos fixos por raridade + bônus de desafios e
        checklists — mede o quanto você colecionou, e é ele que dá prioridade nas filas de drops.
      </>
    ),
  },
  {
    id: 'acoes',
    title: 'Travar, Queimar e Virar ficha',
    body: (
      <>
        <strong>Travar</strong>: prende o Momento por 1 ano (não vende, não presenteia) — é como se
        pontua nos Rankings. <strong>Queimar</strong>: destrói o exemplar para sempre e reduz a
        circulação da edição (base dos desafios de bate-troca). <strong>Virar ficha</strong>: queima o
        Momento em troca de 1 <Link href="/fichas" className="text-accent3 underline">Ficha de Troca</Link>,
        que compra pacotes exclusivos.
      </>
    ),
  },
  {
    id: 'pacotes',
    title: 'Pacotes e Drops',
    body: (
      <>
        <strong>Pacotes</strong> revelam Momentos por sorteio ponderado de raridade (as odds ficam no
        card do pacote). <strong>Drops</strong> são lançamentos com fila: você entra na sala de
        espera, recebe uma posição aleatória e uma <strong>janela de 20 minutos</strong> para
        comprar. Quem fica de fora pode tentar os pacotes de repescagem (rebound).
      </>
    ),
  },
  {
    id: 'jogar',
    title: 'Jogar: desafios, rankings e Matchday',
    body: (
      <>
        Seus Momentos são peças de jogo: <strong>Desafios</strong> pedem coleções específicas (ou
        bate-troca) por recompensas; <strong>Rankings</strong> pontuam Momentos travados;{' '}
        <strong>Checklists</strong> premiam coleções completas; e o <strong>Matchday</strong> é o
        fantasy diário — escale 5 jogadores, bata o alvo do dia e sobreviva ao mata-mata. Veja o{' '}
        <Link href="/jogar" className="text-accent3 underline">hub Jogar</Link>.
      </>
    ),
  },
  {
    id: 'checkin',
    title: 'Check-in no estádio',
    body: (
      <>
        O diferencial do wefans: em dia de jogo do time que você segue, estando{' '}
        <strong>dentro do raio do estádio</strong>, o check-in no app te dá um pacote —{' '}
        <em>prova de presença</em>. A validação é 100% no servidor (GPS falso não passa). Na web,
        a página <Link href="/checkin" className="text-accent3 underline">Check-in</Link> simula o fluxo.
      </>
    ),
  },
  {
    id: 'carteira',
    title: 'Carteira (moeda de teste)',
    body: (
      <>
        O saldo em R$ é <strong>fictício</strong> — moeda de teste para experimentar o produto.
        Você ganha R$ 500 ao criar a conta e pode depositar mais à vontade no{' '}
        <Link href="/perfil" className="text-accent3 underline">perfil</Link>. Nenhum dinheiro real
        é movimentado.
      </>
    ),
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent3">Guia rápido</p>
      <h1 className="mt-2 font-display text-5xl uppercase leading-[0.95] text-ink">Como funciona</h1>
      <p className="mt-3 text-muted">
        Todos os termos que aparecem nos cards e páginas, em linguagem de torcedor.
      </p>

      <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="seções">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="rounded-2xl border border-line bg-panel p-5 scroll-mt-20">
            <h2 className="font-display text-2xl uppercase text-ink">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
        <p className="text-xs text-muted">Ficou com dúvida? Os rótulos dos cards têm tooltips.</p>
        <Link
          href="/pacotes"
          className="rounded-lg bg-accent px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          Abrir um pacote
        </Link>
      </div>
    </main>
  );
}
