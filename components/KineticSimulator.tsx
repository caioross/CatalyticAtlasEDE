'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import type { KineticsDoc } from '@/lib/types';

type Props = {
  kinetics: KineticsDoc | null;
  enzymeName: string;
  className?: string;
};

type Params = {
  kcat: number;   // s⁻¹
  Km: number;     // mM
  Et: number;     // enzyme concentration, μM
  S0: number;     // substrate concentration, mM
  tMax: number;   // s
  inhibitor: { type: 'none' | 'competitive' | 'non-competitive' | 'uncompetitive'; Ki: number; I: number };
};

const DEFAULTS: Params = {
  kcat: 100,
  Km: 1.0,
  Et: 1.0,
  S0: 5.0,
  tMax: 30,
  inhibitor: { type: 'none', Ki: 1.0, I: 1.0 },
};

/**
 * Integrates the Michaelis–Menten rate law with an optional reversible inhibitor.
 * dS/dt = -v(S),  v(S) = Vmax * S / (Km_app + S),   where Vmax = kcat * [E]t,
 * and Km_app depends on the inhibition mode (standard textbook forms).
 */
function simulate(p: Params, steps = 400) {
  const Vmax = p.kcat * p.Et * 1e-6 * 1e3; // convert μM→M; express v in mM/s
  let Km_app = p.Km;
  let Vmax_app = Vmax;

  if (p.inhibitor.type === 'competitive') {
    Km_app = p.Km * (1 + p.inhibitor.I / p.inhibitor.Ki);
  } else if (p.inhibitor.type === 'non-competitive') {
    Vmax_app = Vmax / (1 + p.inhibitor.I / p.inhibitor.Ki);
  } else if (p.inhibitor.type === 'uncompetitive') {
    const alpha = 1 + p.inhibitor.I / p.inhibitor.Ki;
    Km_app = p.Km / alpha;
    Vmax_app = Vmax / alpha;
  }

  const dt = p.tMax / steps;
  let S = p.S0;
  let P = 0;
  const t: number[] = [];
  const Sa: number[] = [];
  const Pa: number[] = [];
  const va: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const v = (Vmax_app * S) / (Km_app + Math.max(S, 1e-9));
    t.push(i * dt);
    Sa.push(S);
    Pa.push(P);
    va.push(v);
    if (i < steps) {
      // RK4 integration for stability
      const k1 = -v;
      const k2 = -((Vmax_app * Math.max(S + (dt / 2) * k1, 0)) / (Km_app + Math.max(S + (dt / 2) * k1, 1e-9)));
      const k3 = -((Vmax_app * Math.max(S + (dt / 2) * k2, 0)) / (Km_app + Math.max(S + (dt / 2) * k2, 1e-9)));
      const k4 = -((Vmax_app * Math.max(S + dt * k3, 0)) / (Km_app + Math.max(S + dt * k3, 1e-9)));
      const dS = (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      S = Math.max(0, S + dS);
      P = p.S0 - S;
    }
  }

  const mmCurve: { S: number; v: number }[] = [];
  const sMaxChart = p.S0 * 5;
  for (let i = 0; i <= 200; i++) {
    const s = (i / 200) * sMaxChart;
    mmCurve.push({ S: s, v: (Vmax_app * s) / (Km_app + s) });
  }

  return { t, S: Sa, P: Pa, v: va, Km_app, Vmax_app, mmCurve };
}

export default function KineticSimulator({ kinetics, enzymeName, className }: Props) {
  const first = kinetics?.entries[0];
  const [p, setP] = useState<Params>({
    ...DEFAULTS,
    kcat: first?.kcat_s ?? DEFAULTS.kcat,
    Km: first?.Km_mM ?? DEFAULTS.Km,
  });

  const sim = useMemo(() => simulate(p), [p]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mmCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawProgress(canvasRef.current, sim.t, sim.S, sim.P, p.S0);
    drawMM(mmCanvasRef.current, sim.mmCurve, p.Km, p.kcat * p.Et * 1e-6 * 1e3);
  }, [sim, p]);

  return (
    <div className={cn('panel p-5', className)}>
      <div>
        <div className="eyebrow">Michaelis–Menten · steady-state simulator</div>
        <h3 className="mt-1 font-display text-xl leading-tight text-paper-50">
          Run {enzymeName} in silico.
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-paper-200">
          Integrate the reaction v = V<sub>max</sub>·[S] / (K<sub>m,app</sub> + [S]) in closed form with RK4,
          across any [S], [E], and an optional reversible inhibitor. Defaults are drawn from the curated
          kinetic record for this enzyme where available.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="eyebrow">Progress curve · [S](t) and [P](t)</span>
              <span className="tabular font-mono text-2xs text-paper-400">{p.tMax} s window</span>
            </div>
            <canvas ref={canvasRef} width={720} height={220} className="h-[220px] w-full rounded bg-stage-950" />
            <div className="mt-1 flex items-center gap-4 font-mono text-2xs text-paper-400">
              <LegendDot color="#d4613a" label="substrate [S]" />
              <LegendDot color="#7ba8a3" label="product [P]" />
            </div>
          </div>

          <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="eyebrow">Saturation · v vs. [S]</span>
              <span className="tabular font-mono text-2xs text-paper-400">
                K<sub>m,app</sub> = {formatNumber(sim.Km_app, 3)} mM · V<sub>max,app</sub> = {formatNumber(sim.Vmax_app, 3)} mM/s
              </span>
            </div>
            <canvas ref={mmCanvasRef} width={720} height={180} className="h-[180px] w-full rounded bg-stage-950" />
          </div>
        </div>

        <div className="space-y-3">
          <Slider label="kcat" value={p.kcat} unit="s⁻¹" min={0.1} max={5000} step={0.1} logScale onChange={(v) => setP({ ...p, kcat: v })} />
          <Slider label="Km" value={p.Km} unit="mM" min={0.001} max={100} step={0.001} logScale onChange={(v) => setP({ ...p, Km: v })} />
          <Slider label="[E]total" value={p.Et} unit="μM" min={0.01} max={100} step={0.01} logScale onChange={(v) => setP({ ...p, Et: v })} />
          <Slider label="[S]₀" value={p.S0} unit="mM" min={0.01} max={100} step={0.01} logScale onChange={(v) => setP({ ...p, S0: v })} />
          <Slider label="Duration" value={p.tMax} unit="s" min={1} max={600} step={1} onChange={(v) => setP({ ...p, tMax: v })} />

          <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <div className="eyebrow mb-2">Inhibitor</div>
            <div className="grid grid-cols-2 gap-1">
              {(['none', 'competitive', 'non-competitive', 'uncompetitive'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setP({ ...p, inhibitor: { ...p.inhibitor, type: t } })}
                  className={cn(
                    'rounded border px-2 py-1 font-mono text-2xs uppercase tracking-wider transition',
                    p.inhibitor.type === t
                      ? 'border-catalytic-gold/60 bg-catalytic-gold/15 text-catalytic-gold'
                      : 'border-stage-700 bg-stage-850/60 text-paper-200 hover:border-catalytic-gold/40',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {p.inhibitor.type !== 'none' && (
              <div className="mt-2 space-y-2">
                <Slider label="[I]" value={p.inhibitor.I} unit="mM" min={0.001} max={100} step={0.001} logScale onChange={(v) => setP({ ...p, inhibitor: { ...p.inhibitor, I: v } })} />
                <Slider label="Ki" value={p.inhibitor.Ki} unit="mM" min={0.001} max={100} step={0.001} logScale onChange={(v) => setP({ ...p, inhibitor: { ...p.inhibitor, Ki: v } })} />
              </div>
            )}
          </div>
        </div>
      </div>

      {kinetics && kinetics.entries.length > 0 && (
        <div className="mt-4 rounded-md border border-catalytic-sand/30 bg-catalytic-sand/5 p-3">
          <div className="eyebrow mb-1 text-catalytic-sand">Curated kinetic record</div>
          <p className="text-xs leading-relaxed text-paper-200">
            Defaults seeded from{' '}
            <span className="font-mono">{kinetics.entries[0].substrate}</span> at pH {kinetics.entries[0].pH ?? '?'} /
            {' '}{kinetics.entries[0].temperature_C ?? '?'} °C — source:{' '}
            <a href={kinetics.entries[0].sourceUrl} target="_blank" rel="noreferrer" className="text-catalytic-sand underline-offset-2 hover:underline">
              {kinetics.entries[0].source}
            </a>.
          </p>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Slider({
  label,
  value,
  unit,
  min,
  max,
  step,
  logScale,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  logScale?: boolean;
  onChange: (v: number) => void;
}) {
  const raw = logScale ? Math.log10(Math.max(value, min)) : value;
  const rawMin = logScale ? Math.log10(min) : min;
  const rawMax = logScale ? Math.log10(max) : max;
  const sliderStep = logScale ? (rawMax - rawMin) / 200 : step;

  return (
    <label className="block rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="tabular font-mono text-xs text-catalytic-gold">
          {formatNumber(value, 3)}
          {unit && <span className="ml-1 text-2xs text-paper-400">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={rawMin}
        max={rawMax}
        step={sliderStep}
        value={raw}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(logScale ? Math.pow(10, v) : v);
        }}
        className="mt-1 w-full accent-catalytic-gold"
      />
    </label>
  );
}

function drawProgress(canvas: HTMLCanvasElement | null, t: number[], S: number[], P: number[], S0: number) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.clientWidth * DPR;
  const H = canvas.clientHeight * DPR;
  canvas.width = W;
  canvas.height = H;
  ctx.scale(1, 1);
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, W, H);

  const pad = { top: 10 * DPR, right: 12 * DPR, bottom: 22 * DPR, left: 36 * DPR };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const tMax = t[t.length - 1] || 1;
  const yMax = Math.max(S0, 1e-9);
  ctx.strokeStyle = 'rgba(144, 152, 180, 0.18)';
  ctx.lineWidth = DPR;
  for (let gy = 0; gy <= 4; gy++) {
    const y = pad.top + (ph * gy) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  const drawCurve = (arr: number[], color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * DPR;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const x = pad.left + (t[i] / tMax) * pw;
      const y = pad.top + ph - (arr[i] / yMax) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  drawCurve(S, '#d4613a');
  drawCurve(P, '#7ba8a3');

  ctx.fillStyle = '#a89f88';
  ctx.font = `${11 * DPR}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(`${yMax.toFixed(2)} mM`, pad.left - 4, pad.top + 4 * DPR);
  ctx.fillText('0', pad.left - 4, pad.top + ph + 3);
  ctx.textAlign = 'center';
  ctx.fillText('time (s)', W / 2, H - 4 * DPR);
}

function drawMM(canvas: HTMLCanvasElement | null, curve: { S: number; v: number }[], Km: number, Vmax: number) {
  if (!canvas || !curve.length) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.clientWidth * DPR;
  const H = canvas.clientHeight * DPR;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, W, H);

  const pad = { top: 10 * DPR, right: 12 * DPR, bottom: 22 * DPR, left: 46 * DPR };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const sMax = curve[curve.length - 1].S;
  const vMax = Vmax * 1.05;

  ctx.strokeStyle = 'rgba(144, 152, 180, 0.18)';
  ctx.lineWidth = DPR;
  for (let gy = 0; gy <= 4; gy++) {
    const y = pad.top + (ph * gy) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#e8b86d';
  ctx.lineWidth = 2 * DPR;
  ctx.beginPath();
  curve.forEach(({ S, v }, i) => {
    const x = pad.left + (S / sMax) * pw;
    const y = pad.top + ph - (v / vMax) * ph;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = 'rgba(232, 184, 109, 0.4)';
  ctx.setLineDash([4 * DPR, 3 * DPR]);
  const kmX = pad.left + (Km / sMax) * pw;
  ctx.beginPath();
  ctx.moveTo(kmX, pad.top);
  ctx.lineTo(kmX, pad.top + ph);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#a89f88';
  ctx.font = `${11 * DPR}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(`${vMax.toFixed(2)}`, pad.left - 4, pad.top + 4 * DPR);
  ctx.fillText('v (mM/s)', pad.left - 4, pad.top + ph / 2);
  ctx.textAlign = 'center';
  ctx.fillText('[S] (mM)', W / 2, H - 4 * DPR);
  ctx.fillStyle = '#e8b86d';
  ctx.fillText(`Km`, kmX, pad.top + 12 * DPR);
}
