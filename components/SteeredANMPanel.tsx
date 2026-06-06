'use client';

import { useMemo, useState } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { steeredResponse } from '@/lib/enm';
import type { CAAtom } from '@/lib/pdb';
import type { ENMResult } from '@/lib/types';
import ModeViewer from './ModeViewer';

type Props = {
  atoms: CAAtom[];
  result: ENMResult;
  className?: string;
};

const DIRECTIONS: { label: string; force: { x: number; y: number; z: number } }[] = [
  { label: '+X', force: { x: 1, y: 0, z: 0 } },
  { label: '−X', force: { x: -1, y: 0, z: 0 } },
  { label: '+Y', force: { x: 0, y: 1, z: 0 } },
  { label: '−Y', force: { x: 0, y: -1, z: 0 } },
  { label: '+Z', force: { x: 0, y: 0, z: 1 } },
  { label: '−Z', force: { x: 0, y: 0, z: -1 } },
];

export default function SteeredANMPanel({ atoms, result, className }: Props) {
  const [targetIdx, setTargetIdx] = useState<number>(0);
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [amplitude, setAmplitude] = useState<number>(6);

  const response = useMemo(() => {
    if (!result.eigenvalues.length) return null;
    return steeredResponse(result.modes, result.eigenvalues, result.eigenvectors, targetIdx, direction.force, 1);
  }, [result, targetIdx, direction]);

  const magnitudes = useMemo(() => {
    if (!response) return [];
    return response.map((v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z));
  }, [response]);

  const maxMag = magnitudes.length ? Math.max(...magnitudes) : 0;

  const syntheticMode = useMemo(() => {
    if (!response) return null;
    return {
      index: 0,
      eigenvalue: 1,
      frequency: 0,
      collectivity: 0,
      vectors: response,
    };
  }, [response]);

  const topMovers = useMemo(() => {
    if (!magnitudes.length) return [] as { i: number; m: number }[];
    return magnitudes
      .map((m, i) => ({ m, i }))
      .sort((a, b) => b.m - a.m)
      .slice(0, 8);
  }, [magnitudes]);

  return (
    <div className={cn('panel p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Steered ANM · pseudo-inverse response</div>
          <h3 className="mt-1 font-display text-xl leading-tight text-paper-50">
            Push a residue. Watch the whole protein relax along its soft modes.
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-paper-200">
            Applies a unit force at the chosen Cα and sums over the non-trivial
            normal modes to compute Δr = Σ<sub className="text-2xs">k&gt;6</sub> (1/λ<sub className="text-2xs">k</sub>)(v<sub className="text-2xs">k</sub>·f)v<sub className="text-2xs">k</sub>.
            This is the mechanical fingerprint of how information propagates from that site.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          {syntheticMode && (
            <ModeViewer
              atoms={atoms}
              mode={syntheticMode}
              amplitude={amplitude / (maxMag > 1e-9 ? maxMag : 1)}
              frames={20}
              className="h-[420px]"
            />
          )}

          {magnitudes.length > 0 && (
            <div className="mt-4 rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="eyebrow">Per-residue response magnitude</span>
                <span className="tabular font-mono text-2xs text-paper-400">peak {formatNumber(maxMag, 3)} Å/unit force</span>
              </div>
              <div className="flex h-16 items-end gap-px overflow-x-auto">
                {magnitudes.map((m, i) => {
                  const hTarget = i === targetIdx;
                  const intensity = maxMag > 1e-9 ? m / maxMag : 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setTargetIdx(i)}
                      title={`${result.residues[i].resn}${result.residues[i].resi} ${result.residues[i].chain} — |Δr|=${formatNumber(m, 3)}`}
                      className="shrink-0 transition hover:opacity-80"
                      style={{
                        width: '4px',
                        height: `${Math.max(1, intensity * 100)}%`,
                        backgroundColor: hTarget ? '#e8b86d' : `rgba(232, 184, 109, ${0.2 + intensity * 0.8})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <div className="eyebrow mb-2">Target residue</div>
            <div className="max-h-44 overflow-y-auto rounded border border-stage-700/60 bg-stage-950/60">
              {result.residues.map((r, i) => (
                <button
                  key={`${r.chain}-${r.resi}`}
                  onClick={() => setTargetIdx(i)}
                  className={cn(
                    'block w-full border-l-2 px-2 py-1 text-left font-mono text-xs transition',
                    i === targetIdx
                      ? 'border-catalytic-gold bg-catalytic-gold/10 text-catalytic-gold'
                      : 'border-transparent text-paper-200 hover:bg-stage-800',
                  )}
                >
                  <span className="tabular">{r.resn}{r.resi}</span>
                  <span className="ml-1 text-paper-400">{r.chain}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <div className="eyebrow mb-2">Direction of pull</div>
            <div className="grid grid-cols-3 gap-1.5">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setDirection(d)}
                  className={cn(
                    'rounded border px-2 py-1.5 font-mono text-xs transition',
                    d.label === direction.label
                      ? 'border-catalytic-gold/60 bg-catalytic-gold/15 text-catalytic-gold'
                      : 'border-stage-700 bg-stage-850/60 text-paper-100 hover:border-catalytic-gold/40',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Visual amplitude</span>
                <span className="tabular font-mono text-2xs text-paper-400">{amplitude} Å</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="w-full accent-catalytic-gold"
              />
            </div>
          </div>

          {topMovers.length > 0 && (
            <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
              <div className="eyebrow mb-2">Most affected residues</div>
              <ul className="space-y-1">
                {topMovers.map(({ i, m }) => {
                  const r = result.residues[i];
                  return (
                    <li key={`${r.chain}-${r.resi}`} className="flex items-baseline justify-between font-mono text-xs">
                      <span className="text-paper-100">
                        {r.resn}{r.resi}
                        <span className="ml-1 text-paper-400">{r.chain}</span>
                      </span>
                      <span className="tabular text-catalytic-gold">{formatNumber(m, 3)} Å</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
