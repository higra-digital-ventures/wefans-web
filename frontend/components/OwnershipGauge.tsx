// Medidor semicircular de propriedade (seção 11.5) — distribuição dos exemplares
// da edição em um arco: Não listados · À venda · Travados · Queimados.
export default function OwnershipGauge({
  existing,
  listed,
  locked,
  burned,
}: {
  existing: number;
  listed: number;
  locked: number;
  burned: number;
}) {
  const unlisted = Math.max(0, existing - burned - listed - locked);
  const segments = [
    { label: 'Não listados', value: unlisted, color: '#21d4e0' },
    { label: 'À venda', value: listed, color: '#ff2e88' },
    { label: 'Travados', value: locked, color: '#ff9e2c' },
    { label: 'Queimados', value: burned, color: '#9a8aa6' },
  ];
  const total = Math.max(1, existing);

  // arco de 180° (raio 80, centro 100,100), traçado por segmento
  const R = 80;
  const CIRC = Math.PI * R;
  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * CIRC;
      const a = { ...s, dash: `${len} ${CIRC}`, offset: -offset };
      offset += len;
      return a;
    });

  return (
    <div>
      <div className="mx-auto max-w-[280px]">
        <svg viewBox="0 0 200 110" className="w-full">
          <path d="M20,100 A80,80 0 0 1 180,100" fill="none" stroke="var(--panel2)" strokeWidth="16" strokeLinecap="round" />
          {arcs.map((a) => (
            <path
              key={a.label}
              d="M20,100 A80,80 0 0 1 180,100"
              fill="none"
              stroke={a.color}
              strokeWidth="16"
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
            />
          ))}
          <text x="100" y="82" textAnchor="middle" fill="var(--ink)" fontSize="30" fontWeight="800" fontFamily="var(--font-display)">
            {existing.toLocaleString('pt-BR')}
          </text>
          <text x="100" y="102" textAnchor="middle" fill="var(--muted)" fontSize="10">
            exemplares existentes
          </text>
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto font-mono text-ink">{s.value.toLocaleString('pt-BR')}</span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">atualiza conforme o mercado</p>
    </div>
  );
}
