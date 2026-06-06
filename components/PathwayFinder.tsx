'use client';

import { useMemo, useState } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { dynamicPath } from '@/lib/enm';
import type { CAAtom } from '@/lib/pdb';
import type { ENMResult } from '@/lib/types';

type Props = {
  atoms: CAAtom[];
  result: ENMResult;
  className?: string;
  onPathChange?: (residues: { chain: string; resi: number }[]) => void;
};

export default function PathwayFinder({ atoms, result, className, onPathChange }: Props) {
  const [startIdx, setStartIdx] = useState<number>(0);
  const [endIdx, setEndIdx] = useState<number>(Math.min(atoms.length - 1, 50));
  const [cutoff, setCutoff] = useState<number>(13);

  const path = useMemo(() => {
    if (startIdx === endIdx) return null;
    return dynamicPath(result.crossCorrelation, cutoff, atoms, startIdx, endIdx);
  }, [result.crossCorrelation, cutoff, atoms, startIdx, endIdx]);

  const pathResidues = useMemo(() => {
    if (!path) return [];
    return path.path.map((i) => result.residues[i]);
  }, [path, result.residues]);

  useMemo(() => {
    if (onPathChange) onPathChange(pathResidues.map((r) => ({ chain: r.chain, resi: r.resi })));
  }, [pathResidues, onPathChange]);

  return (
    <div className={cn('panel p-5', className)}>
      <div>
        <div className="eyebrow">Allosteric pathway finder · dynamic shortest path</div>
        <h3 className="mt-1 font-display text-xl leading-tight text-paper-50">
          Trace a line of communication through the protein.
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-paper-200">
          Builds a residue-residue graph where edges exist within the contact cutoff and are weighted by
          1 / (ε + |cross-correlation|). Residues that move together are "closer" in dynamic space, so a
          shortest path finds a plausible allosteric conduit.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <ResiduePicker
            label="Start"
            accent="verdigris"
            value={startIdx}
            residues={result.residues}
            onChange={setStartIdx}
          />
          <ResiduePicker
            label="End"
            accent="terra"
            value={endIdx}
            residues={result.residues}
            onChange={setEndIdx}
          />

          <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Contact cutoff</span>
              <span className="tabular font-mono text-xs text-catalytic-gold">{cutoff.toFixed(1)} Å</span>
            </div>
            <input
              type="range"
              min={8}
              max={20}
              step={0.5}
              value={cutoff}
              onChange={(e) => setCutoff(parseFloat(e.target.value))}
              className="w-full accent-catalytic-gold"
            />
          </div>

          {path && (
            <div className="rounded-md border border-catalytic-verdigris/30 bg-catalytic-verdigris/5 p-3">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow text-catalytic-verdigris">Path statistics</span>
                <span className="tabular font-mono text-xs text-paper-100">{path.path.length} residues</span>
              </div>
              <div className="mt-1 font-mono text-xs text-paper-200">
                cumulative dynamic distance{' '}
                <span className="text-catalytic-verdigris">{formatNumber(path.distance, 3)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
          <div className="eyebrow mb-2">Ordered conduit</div>
          {path ? (
            <div className="max-h-[320px] overflow-y-auto pr-1">
              <ol className="space-y-1">
                {pathResidues.map((r, idx) => {
                  const isEnd = idx === pathResidues.length - 1;
                  const isStart = idx === 0;
                  return (
                    <li
                      key={`${r.chain}-${r.resi}-${idx}`}
                      className="flex items-center gap-2 rounded border border-stage-700/50 bg-stage-950/40 px-2 py-1.5"
                    >
                      <span className="w-6 shrink-0 text-right font-mono text-2xs text-paper-400">{idx + 1}.</span>
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          isStart
                            ? 'bg-catalytic-verdigris'
                            : isEnd
                            ? 'bg-catalytic-terra'
                            : 'bg-catalytic-sand/60',
                        )}
                      />
                      <span className="font-mono text-xs text-paper-100">
                        {r.resn}
                        <span className="tabular">{r.resi}</span>
                      </span>
                      <span className="ml-auto font-mono text-2xs text-paper-400">chain {r.chain}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="py-10 text-center font-mono text-2xs uppercase tracking-widest text-paper-400">
              No path found at this cutoff. Try increasing it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResiduePicker({
  label,
  accent,
  value,
  residues,
  onChange,
}: {
  label: string;
  accent: 'verdigris' | 'terra';
  value: number;
  residues: ENMResult['residues'];
  onChange: (idx: number) => void;
}) {
  const [filter, setFilter] = useState('');
  const current = residues[value];
  const accentClass = accent === 'verdigris' ? 'border-catalytic-verdigris/60 bg-catalytic-verdigris/10 text-catalytic-verdigris' : 'border-catalytic-terra/60 bg-catalytic-terra/10 text-catalytic-terra';

  const filtered = residues
    .map((r, i) => ({ r, i }))
    .filter(({ r }) =>
      !filter.trim() ||
      `${r.resn}${r.resi}`.toLowerCase().includes(filter.trim().toLowerCase()) ||
      r.chain.toLowerCase() === filter.trim().toLowerCase(),
    );

  return (
    <div className="rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className={cn('eyebrow', accent === 'verdigris' ? 'text-catalytic-verdigris' : 'text-catalytic-terra')}>{label}</span>
        <span className="tabular font-mono text-xs text-paper-100">
          {current ? `${current.resn}${current.resi}` : '—'}{current ? ` · ${current.chain}` : ''}
        </span>
      </div>
      <input
        placeholder="filter resi or chain…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mt-2 w-full rounded border border-stage-700 bg-stage-950 px-2 py-1 font-mono text-xs text-paper-100 outline-none focus:border-catalytic-gold"
      />
      <div className="mt-1 max-h-32 overflow-y-auto rounded border border-stage-700/60 bg-stage-950/60">
        {filtered.slice(0, 120).map(({ r, i }) => (
          <button
            key={`${r.chain}-${r.resi}`}
            onClick={() => onChange(i)}
            className={cn(
              'block w-full border-l-2 px-2 py-1 text-left font-mono text-2xs transition',
              i === value ? accentClass : 'border-transparent text-paper-200 hover:bg-stage-800',
            )}
          >
            <span className="tabular">{r.resn}{r.resi}</span>
            <span className="ml-1 text-paper-400">{r.chain}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
