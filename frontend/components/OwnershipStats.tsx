// Distribuição de propriedade — versão em barra (o medidor semicircular de 6 estados
// da seção 11.5 fica para a Fase 11). Aqui: existentes, circulantes, à venda, queimados.
export default function OwnershipStats({
  existing,
  circulating,
  burned,
  listed,
}: {
  existing: number;
  circulating: number;
  burned: number;
  listed?: number;
}) {
  const pct = (n: number) => (existing > 0 ? (n / existing) * 100 : 0);
  const items = [
    { label: 'Existentes', value: existing, color: '#f6eef3' },
    { label: 'Circulantes', value: circulating, color: '#21d4e0' },
    ...(listed !== undefined ? [{ label: 'À venda', value: listed, color: '#ff2e88' }] : []),
    { label: 'Burned', value: burned, color: '#9a8aa6' },
  ];

  return (
    <div>
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-panel2">
        <div style={{ width: `${pct(circulating - (listed ?? 0))}%`, background: '#21d4e0' }} />
        {listed !== undefined && <div style={{ width: `${pct(listed)}%`, background: '#ff2e88' }} />}
        <div style={{ width: `${pct(burned)}%`, background: '#9a8aa6' }} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label}>
            <div className="font-display text-xl" style={{ color: i.color }}>
              {i.value.toLocaleString('pt-BR')}
            </div>
            <div className="text-xs text-muted">{i.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">atualiza conforme o mercado</p>
    </div>
  );
}
