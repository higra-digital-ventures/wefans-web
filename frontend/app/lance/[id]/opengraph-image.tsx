import { ImageResponse } from 'next/og';
import { getTemplateServer } from '@/lib/api-server';
import { TIER_META } from '@/lib/tiers';

// Card de compartilhamento da edição (WhatsApp/X/Discord).
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const t = await getTemplateServer(params.id);
  const meta = t ? TIER_META[t.tier] : { label: '', color: '#ff2e88' };
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(120deg, #0a0a0b 55%, #1a0b2e)',
          color: '#fff',
          fontSize: 32,
        }}
      >
        <div style={{ display: 'flex', color: meta.color, fontSize: 28, fontWeight: 700 }}>
          {t ? `${meta.label.toUpperCase()} · ${t.editionType === 'LIMITADA' ? `/${t.editionSize}` : 'CC'}` : 'WEFANS'}
        </div>
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, lineHeight: 1 }}>
          {t?.player.name ?? 'Momentos de Futebol'}
        </div>
        <div style={{ display: 'flex', color: '#a3a3a3', fontSize: 36, marginTop: 12 }}>
          {t ? `${t.title} · ${t.competition}` : 'Lances numerados, colecionáveis.'}
        </div>
        <div style={{ display: 'flex', marginTop: 48, alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 28, height: 28, borderRadius: 999, background: meta.color }} />
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>wefans</div>
        </div>
      </div>
    ),
    size,
  );
}
