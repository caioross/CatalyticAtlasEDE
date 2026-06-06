'use client';

import { useEffect, useRef } from 'react';

type Props = {
  values: number[];
  labels?: { resi: number; resn: string; chain: string }[];
  title?: string;
  height?: number;
  color?: string;
  highlightIndices?: number[];
};

export default function PerResiduePlot({
  values,
  labels,
  title,
  height = 140,
  color = '#e8b86d',
  highlightIndices = [],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || values.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const max = Math.max(...values, 1e-9);
    const min = Math.min(...values, 0);

    const padL = 36;
    const padR = 8;
    const padT = 8;
    const padB = 20;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    // Editorial gridlines (warm stage tones)
    ctx.strokeStyle = 'rgba(79, 70, 62, 0.5)';
    ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = padT + (plotH * k) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#a8a096';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const val = max - ((max - min) * k) / 4;
      const y = padT + (plotH * k) / 4;
      ctx.fillText(val.toPrecision(2), 2, y);
    }

    for (const h of highlightIndices) {
      if (h < 0 || h >= values.length) continue;
      const x = padL + (plotW * h) / (values.length - 1 || 1);
      ctx.fillStyle = 'rgba(232, 184, 109, 0.16)';
      ctx.fillRect(x - 1.5, padT, 3, plotH);
    }

    // Area fill (low alpha of primary color)
    ctx.fillStyle = color + '28';
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padL + (plotW * i) / (values.length - 1 || 1);
      const y = padT + plotH - ((v - min) / (max - min || 1)) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.lineTo(padL, padT + plotH);
    ctx.closePath();
    ctx.fill();

    // Line on top
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padL + (plotW * i) / (values.length - 1 || 1);
      const y = padT + plotH - ((v - min) / (max - min || 1)) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X-axis residue ticks
    ctx.fillStyle = '#a8a096';
    ctx.textBaseline = 'alphabetic';
    if (labels?.length) {
      const ticks = 6;
      for (let k = 0; k <= ticks; k++) {
        const idx = Math.round(((values.length - 1) * k) / ticks);
        const x = padL + (plotW * idx) / (values.length - 1 || 1);
        const r = labels[idx];
        if (!r) continue;
        const lbl = `${r.chain}${r.resi}`;
        ctx.fillText(lbl, x - (lbl.length * 3), H - 5);
      }
    }
  }, [values, labels, color, highlightIndices]);

  return (
    <div className="rounded-md border border-stage-700/60 bg-stage-900/70 p-3">
      {title && <div className="mb-2 eyebrow">{title}</div>}
      <canvas ref={canvasRef} style={{ width: '100%', height }} className="rounded" />
    </div>
  );
}
