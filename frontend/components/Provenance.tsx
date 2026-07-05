import Link from 'next/link';
import { brl, dateTime, timeAgo } from '@/lib/format';
import type { ProvenanceTx } from '@/lib/types';

const META: Record<string, { label: string; color: string; d: string }> = {
  MINT: {
    label: 'Criado',
    color: '#21d4e0',
    d: 'M12 2 9.5 8.5 2 9.3l5.5 4.9L5.8 22 12 18.3 18.2 22l-1.7-7.8L22 9.3l-7.5-.8Z',
  },
  BUY: {
    label: 'Compra',
    color: '#22c55e',
    d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Zm0 2h12l1.5 2h-15L6 4Zm-1 4h14v12H5V8Z',
  },
  SELL: {
    label: 'Venda',
    color: '#22c55e',
    d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Zm0 2h12l1.5 2h-15L6 4Zm-1 4h14v12H5V8Z',
  },
  OFFER_ACCEPT: {
    label: 'Oferta aceita',
    color: '#21d4e0',
    d: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z',
  },
  REWARD: {
    label: 'Recompensa',
    color: '#ff9e2c',
    d: 'M18 4V2H6v2H2v3a5 5 0 0 0 5 5h.4A6 6 0 0 0 11 14.9V18H7v4h10v-4h-4v-3.1a6 6 0 0 0 3.6-2.9H17a5 5 0 0 0 5-5V4Z',
  },
  BURN: {
    label: 'Queimado',
    color: '#ff2e88',
    d: 'M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.2.3-2.3.8-3.4C8.6 9 10 10 10 10s-.5-4 2-8Zm0 18a7 7 0 0 0 7-7c0-.7-.1-1.4-.3-2 .8 1.2 1.3 2.6 1.3 4a8 8 0 1 1-16 0c0-1.4.5-2.8 1.3-4-.2.6-.3 1.3-.3 2a7 7 0 0 0 7 7Z',
  },
  GIFT: {
    label: 'Presente',
    color: '#9d4edd',
    d: 'M20 7h-2.2A3.5 3.5 0 0 0 12 3.3 3.5 3.5 0 0 0 6.2 7H4a1 1 0 0 0-1 1v3h18V8a1 1 0 0 0-1-1ZM3 13v7a1 1 0 0 0 1 1h7v-8H3Zm10 8h7a1 1 0 0 0 1-1v-7h-8v8Z',
  },
  FASTBREAK_REWARD: {
    label: 'Prêmio do Matchday',
    color: '#f7f7f8',
    d: 'M18 4V2H6v2H2v3a5 5 0 0 0 5 5h.4A6 6 0 0 0 11 14.9V18H7v4h10v-4h-4v-3.1a6 6 0 0 0 3.6-2.9H17a5 5 0 0 0 5-5V4Z',
  },
};

const Who = ({ u }: { u: string }) => (
  <Link href={`/u/${u}`} className="font-semibold text-ink hover:underline">
    @{u}
  </Link>
);

// Procedência: linha do tempo de donos/transações (seção 11.5) — ícone por tipo,
// preço em destaque e fluxo de dono "de @a → para @b" clicável.
// `bare` = sem título/margem próprios (quando embutida num Panel colapsável).
export default function Provenance({ items, bare = false }: { items: ProvenanceTx[]; bare?: boolean }) {
  if (!items.length) return bare ? <p className="text-sm text-muted">Sem transações ainda.</p> : null;
  return (
    <div className={bare ? '' : 'mt-8'}>
      {!bare && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Procedência</h2>
      )}
      <ol className="relative ml-4 border-l border-line pl-6">
        {items.map((tx) => {
          const meta = META[tx.type] ?? { label: tx.type, color: '#a3a3a3', d: '' };
          return (
            <li key={tx.id} className="mb-5 last:mb-0">
              <span
                className="absolute -left-[13px] flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10"
                style={{ background: '#101012' }}
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" style={{ fill: meta.color }}>
                  <path d={meta.d} />
                </svg>
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold text-ink">{meta.label}</span>
                {tx.amountCents > 0 && (
                  <span className="text-[14px] font-bold text-white">{brl(tx.amountCents)}</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {tx.seller && tx.buyer ? (
                  <>
                    <Who u={tx.seller} /> <span aria-hidden>→</span> <Who u={tx.buyer} />
                  </>
                ) : tx.buyer ? (
                  <>
                    para <Who u={tx.buyer} />
                  </>
                ) : tx.seller ? (
                  <>
                    de <Who u={tx.seller} />
                  </>
                ) : null}
                {(tx.seller || tx.buyer) && ' · '}
                <span title={dateTime(tx.createdAt)}>{timeAgo(tx.createdAt)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
