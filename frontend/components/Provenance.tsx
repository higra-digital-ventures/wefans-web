import { brl, dateTime } from '@/lib/format';
import type { ProvenanceTx } from '@/lib/types';

const LABELS: Record<string, string> = {
  MINT: 'Cunhado',
  BUY: 'Compra',
  SELL: 'Venda',
  OFFER_ACCEPT: 'Oferta aceita',
  REWARD: 'Recompensa',
  BURN: 'Queimado',
  GIFT: 'Presente',
  FASTBREAK_REWARD: 'Prêmio da Pelada',
};

// Procedência: linha do tempo de donos/transações (seção 11.5).
// `bare` = sem título/margem próprios (quando embutida num Panel colapsável).
export default function Provenance({ items, bare = false }: { items: ProvenanceTx[]; bare?: boolean }) {
  if (!items.length) return bare ? <p className="text-sm text-muted">Sem transações ainda.</p> : null;
  return (
    <div className={bare ? '' : 'mt-8'}>
      {!bare && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Procedência</h2>
      )}
      <ol className="relative ml-1 border-l border-line pl-5">
        {items.map((tx) => (
          <li key={tx.id} className="mb-4 last:mb-0">
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink">{LABELS[tx.type] ?? tx.type}</span>
              {tx.amountCents > 0 && (
                <span className="font-mono text-sm text-accent3">{brl(tx.amountCents)}</span>
              )}
            </div>
            <div className="text-xs text-muted">
              {tx.seller && `de @${tx.seller} `}
              {tx.buyer && `para @${tx.buyer}`}
              {(tx.seller || tx.buyer) && ' · '}
              {dateTime(tx.createdAt)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
