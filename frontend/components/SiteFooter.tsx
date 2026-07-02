import Link from 'next/link';

// Footer no padrão do Top Shot (seção 11.12a): Comunidade + Suporte/Sobre/Legal,
// badges de loja (o app é divulgado no rodapé da web) e linha de copyright com selos.

function Social({ label, path }: { label: string; path: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel2 hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
        <path d={path} />
      </svg>
    </a>
  );
}

const COL = 'space-y-2.5 text-[13px]';
const LINK = 'block text-muted transition-colors hover:text-ink';
const HEAD = 'mb-3 text-[13px] font-semibold text-ink';

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-[#08050c]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className={HEAD}>Entre na comunidade</div>
          <div className="mb-5 flex gap-1">
            <Social label="X" path="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.3l7.3-8.3L2.7 2H9l4.4 5.9L18.9 2Zm-1.1 18h1.7L7.9 3.8H6.1L17.8 20Z" />
            <Social label="Instagram" path="M12 2c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1 .1 1.3.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1 .1-1.3.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1C3.7 15 3.7 14.7 3.7 12s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1C9 2 9.3 2 12 2Zm0 4.9a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Zm0 1.8a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Zm5.3-2.1a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" />
            <Social label="Facebook" path="M13.5 22v-8h2.7l.4-3.1h-3.1V8.4c0-.9.2-1.5 1.5-1.5h1.7V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.8H7.6V14h2.7v8h3.2Z" />
            <Social label="YouTube" path="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12c0 1.6.1 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z" />
          </div>
          <div className={COL}>
            <Link href="/vitrines" className={LINK}>Encontre um colecionador</Link>
            <Link href="/entrar" className={LINK}>Convide um amigo</Link>
          </div>
          <div className="mt-5 flex gap-2">
            {['Google Play', 'App Store'].map((store) => (
              <span
                key={store}
                className="flex items-center gap-2 rounded-md border border-line bg-black px-3 py-1.5"
                title="App em breve"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-ink" aria-hidden>
                  {store === 'Google Play' ? (
                    <path d="M4 3.5v17l9-8.5-9-8.5Zm10.5 7 2.8-2.6L6.5 3l8 7.5Zm0 3-8 7.5 10.8-4.9-2.8-2.6Zm4.9-2.9-3.2-1.5-3 2.9 3 2.9 3.2-1.5c1.1-.6 1.1-2.2 0-2.8Z" />
                  ) : (
                    <path d="M16.4 12.9c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8c-.1 0-2.7-1-2.8-4ZM14 5.8c.7-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.8-1.4Z" />
                  )}
                </svg>
                <span className="text-left leading-none">
                  <span className="block text-[8px] uppercase text-muted">em breve na</span>
                  <span className="block text-[12px] font-semibold text-ink">{store}</span>
                </span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className={HEAD}>Suporte</div>
          <div className={COL}>
            <Link href="/" className={LINK}>Status</Link>
            <Link href="/conduta" className={LINK}>Ajuda</Link>
            <Link href="/checkin" className={LINK}>Como funciona o check-in?</Link>
            <Link href="/fichas" className={LINK}>Fichas de Troca</Link>
          </div>
        </div>

        <div>
          <div className={HEAD}>Sobre</div>
          <div className={COL}>
            <Link href="/explorar" className={LINK}>Catálogo</Link>
            <Link href="/vitrines" className={LINK}>Comunidade</Link>
            <Link href="/jogar/rankings" className={LINK}>Rankings</Link>
          </div>
        </div>

        <div>
          <div className={HEAD}>Legal</div>
          <div className={COL}>
            <Link href="/conduta" className={LINK}>Termos</Link>
            <Link href="/conduta" className={LINK}>Privacidade</Link>
            <Link href="/conduta" className={LINK}>Código de Conduta</Link>
            <Link href="/jogar/pelada" className={LINK}>Regras da Pelada</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="text-[11px] leading-relaxed text-muted">
            <div>© 2026 wefans.</div>
            <div>
              Todo o conteúdo (jogadores, clubes e competições) é fictício — nenhuma associação com
              ligas ou atletas reais.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {['LA', 'CM', 'SN'].map((liga) => (
              <span
                key={liga}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line font-display text-[10px] text-muted"
                title={liga === 'LA' ? 'Liga Aurora' : liga === 'CM' ? 'Copa das Marés' : 'Supercopa Neon'}
              >
                {liga}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> construído sobre a API wefans
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
