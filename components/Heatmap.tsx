'use client';

import { useEffect, useRef } from 'react';

type Props = {
  matrix: number[][];
  labels?: { resi: number; resn: string; chain: string }[];
  title?: string;
  min?: number;
  max?: number;
  height?: number;
};

// Warm editorial diverging colormap:
// negative → terra (rust-red 212,97,58)
// zero     → near-black stage (26,23,21)
// positive → gold (232,184,109)
function colormapDiverging(v: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    const a = t;
    const r = Math.round(26 + (232 - 26) * a);
    const g = Math.round(23 + (184 - 23) * a);
    const b = Math.round(21 + (109 - 21) * a);
    return [r, g, b];
  }
  const a = -t;
  const r = Math.round(26 + (212 - 26) * a);
  const g = Math.round(23 + (97 - 23) * a);
  const b = Math.round(21 + (58 - 21) * a);
  return [r, g, b];
}

export default function Heatmap({ matrix, labels, title, min = -1, max = 1, height = 320 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const N = matrix.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || N === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const img = ctx.createImageData(N, N);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const v = (matrix[i][j] - (min + max) / 2) / ((max - min) / 2);
        const [r, g, b] = colormapDiverging(v);
        const idx = (i * N + j) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }

    const tmp = document.createElement('canvas');
    tmp.width = N; tmp.height = N;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(tmp, 0, 0, W, H);
  }, [matrix, min, max, N]);

  return (
    <div className="rounded-md border border-stage-700/60 bg-stage-900/70 p-3">
      {title && <div className="mb-2 eyebrow">{title}</div>}
      <canvas ref={canvasRef} style={{ width: '100%', height }} className="rounded" />
      <div className="mt-2 flex items-center justify-between font-mono text-2xs text-paper-400">
        <span className="text-catalytic-terra">← anti-correlated ({min.toFixed(1)})</span>
        <span>uncorrelated (0)</span>
        <span className="text-catalytic-gold">correlated ({max.toFixed(1)}) →</span>
      </div>
      <div
        className="mt-1 h-2 rounded"
        style={{
          background: 'linear-gradient(to right, rgb(212,97,58), rgb(26,23,21), rgb(232,184,109))',
        }}
      />
    </div>
  );
}
