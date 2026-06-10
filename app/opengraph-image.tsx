import { ImageResponse } from 'next/og';

export const alt = 'Catalytic Atlas — Enzyme Dynamics Explorer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#0a0c12',
          backgroundImage:
            'radial-gradient(1000px 500px at 50% -10%, rgba(232,184,109,0.16), transparent 60%), radial-gradient(700px 400px at 100% 110%, rgba(78,158,140,0.14), transparent 65%)',
          color: '#ebe3d0',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* top row: monogram + eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              border: '1px solid rgba(232,184,109,0.4)',
              background: 'linear-gradient(135deg, #161925, #10131b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#e8b86d" strokeWidth={1.6} strokeLinecap="round">
              <path d="M5 4 Q12 8 19 4" />
              <path d="M5 10 Q12 14 19 10" />
              <path d="M5 16 Q12 20 19 16" />
              <path d="M6 4 L6 20" opacity={0.5} />
              <path d="M18 4 L18 20" opacity={0.5} />
            </svg>
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#a89f88',
            }}
          >
            Catalytic Atlas
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, color: '#f7f2e5', letterSpacing: -1.5, display: 'flex', flexWrap: 'wrap' }}>
            The quiet machinery of life,
          </div>
          <div style={{ fontSize: 76, lineHeight: 1.05, fontStyle: 'italic', color: '#e8b86d', letterSpacing: -1.5 }}>
            rendered legibly.
          </div>
          <div style={{ fontSize: 30, color: '#c8ccdd', maxWidth: 900, lineHeight: 1.4, marginTop: 8 }}>
            Structure · mechanism · kinetics · molecular dynamics — all in the browser.
          </div>
        </div>

        {/* bottom row: feature chips */}
        <div style={{ display: 'flex', gap: 16, fontFamily: 'monospace', fontSize: 20, letterSpacing: 3, textTransform: 'uppercase' }}>
          {[
            { label: '3D Mol* viewer', color: '#e8b86d' },
            { label: 'Curated mechanisms', color: '#4e9e8c' },
            { label: 'In-browser ANM', color: '#d4613a' },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid rgba(120,130,150,0.35)',
                borderRadius: 8,
                padding: '12px 20px',
                color: '#c8ccdd',
                background: 'rgba(16,19,27,0.6)',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 99, background: chip.color }} />
              {chip.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
