export const metadata = { title: 'Código de Conduta — wefans' };

// Código de Conduta (item 34 da paridade / seção 6 regra 6).
export default function CondutaPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 font-display text-4xl uppercase text-ink">Código de Conduta</h1>
      <div className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          O wefans é uma comunidade de colecionadores. Para manter o mercado justo e o jogo
          divertido, estas regras valem para todo mundo:
        </p>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <span className="text-ink">Sem manipulação de mercado.</span> Vendas combinadas para
            inflar preço (wash trading) são monitoradas: transações muito acima do preço médio da
            edição são <span className="text-accent">sinalizadas automaticamente</span> e revisadas.
            Contas envolvidas podem ser suspensas.
          </li>
          <li>
            <span className="text-ink">Sem fraude de presença.</span> O check-in de estádio usa
            validação de localização e de dispositivo. Falsificar GPS, usar emuladores ou burlar a
            atestação leva à perda de recompensas e banimento.
          </li>
          <li>
            <span className="text-ink">Uma conta por pessoa.</span> Multi-contas para furar filas de
            drop, farmar recompensas ou distorcer rankings não são permitidas.
          </li>
          <li>
            <span className="text-ink">Respeito na comunidade.</span> Nomes de usuário, vitrines e
            interações não podem conter assédio, ódio ou conteúdo ilegal.
          </li>
          <li>
            <span className="text-ink">Sem afiliação oficial.</span> Nomes de jogadores, clubes e
            competições aparecem apenas para demonstração durante o desenvolvimento; nenhum
            patrocínio ou licenciamento é reivindicado.
          </li>
        </ol>
        <p>
          Violações podem resultar em remoção de anúncios, reversão de transações, perda de
          recompensas ou encerramento de conta, a critério da equipe wefans.
        </p>
      </div>
    </main>
  );
}
