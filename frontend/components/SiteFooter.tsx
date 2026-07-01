import Link from 'next/link';

// Footer institucional (seção 11.2): comunidade, suporte, legal + divulgação do app.
export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-panel/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
        <div>
          <div className="bg-sunset bg-clip-text font-display text-xl uppercase text-transparent">wefans</div>
          <p className="mt-2 text-xs text-muted">
            Momentos de futebol colecionáveis. Conteúdo 100% fictício — nenhuma associação com
            clubes, ligas ou atletas reais.
          </p>
          <p className="mt-3 text-xs text-muted">
            📱 Em breve no app: ganhe pacotes fazendo <span className="text-ink">check-in no estádio</span>.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Explorar</div>
          <ul className="space-y-1.5">
            <li><Link href="/mercado" className="text-muted hover:text-ink">Mercado</Link></li>
            <li><Link href="/drops" className="text-muted hover:text-ink">Drops</Link></li>
            <li><Link href="/jogar/desafios" className="text-muted hover:text-ink">Jogar</Link></li>
            <li><Link href="/vitrines" className="text-muted hover:text-ink">Vitrines</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Legal</div>
          <ul className="space-y-1.5">
            <li><Link href="/conduta" className="text-muted hover:text-ink">Código de Conduta</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-6 py-4 text-center text-[11px] text-muted">
        © 2026 wefans · projeto de demonstração
      </div>
    </footer>
  );
}
