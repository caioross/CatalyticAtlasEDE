'use client';

import { useMemo, useState } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { AA_ORDER, aaOneToInfo, aaThreeToInfo } from '@/lib/residues';
import { estimateMutation, type MutationResult } from '@/lib/mutations';
import type { CAAtom } from '@/lib/pdb';
import type { ResidueSelection } from './MolstarViewer';

type Props = {
  atoms: CAAtom[] | null;
  selection: ResidueSelection | null;
  onClose: () => void;
  className?: string;
};

const SEVERITY_STYLE: Record<MutationResult['severity'], string> = {
  neutral: 'text-paper-200 border-stage-600 bg-stage-800/60',
  mild: 'text-catalytic-sand border-catalytic-sand/40 bg-catalytic-sand/10',
  moderate: 'text-catalytic-gold border-catalytic-gold/50 bg-catalytic-gold/10',
  severe: 'text-catalytic-terra border-catalytic-terra/60 bg-catalytic-terra/15',
};

export default function MutationTool({ atoms, selection, onClose, className }: Props) {
  const [toOne, setToOne] = useState<string>('A');

  const fromInfo = useMemo(
    () => (selection?.resn ? aaThreeToInfo(selection.resn) : null),
    [selection?.resn],
  );

  const result = useMemo(() => {
    if (!atoms || !selection || !fromInfo) return null;
    return estimateMutation(atoms, selection.chain, selection.resi, toOne);
  }, [atoms, selection, fromInfo, toOne]);

  if (!selection) return null;

  return (
    <div
      className={cn(
        'panel w-[380px] p-4 animate-fade-in',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow">In-silico mutation</div>
          <h3 className="mt-1 font-display text-xl leading-tight text-paper-50">
            {fromInfo?.three ?? selection.resn}
            <span className="mx-1 text-paper-400">{selection.resi}</span>
            <span className="mx-1 text-paper-400">→</span>
            {toOne}
          </h3>
          <div className="font-mono text-2xs uppercase tracking-widest text-paper-400">
            chain {selection.chain} · Cα-neighborhood 8.5 Å
          </div>
        </div>
        <button onClick={onClose} className="btn-quiet">Close</button>
      </div>

      <div className="mt-4">
        <div className="eyebrow mb-2">Substitute with</div>
        <div className="grid grid-cols-10 gap-0.5">
          {AA_ORDER.map((one) => {
            const info = aaOneToInfo(one);
            const isCurrent = fromInfo?.one === one;
            const isSelected = toOne === one;
            return (
              <button
                key={one}
                onClick={() => !isCurrent && setToOne(one)}
                disabled={isCurrent}
                title={info?.name}
                className={cn(
                  'rounded-sm border py-1.5 font-mono text-xs transition',
                  isCurrent
                    ? 'cursor-not-allowed border-stage-700 bg-stage-850/40 text-paper-500'
                    : isSelected
                    ? 'border-catalytic-gold/60 bg-catalytic-gold/20 text-catalytic-gold'
                    : 'border-stage-700 bg-stage-850/60 text-paper-200 hover:border-catalytic-gold/40 hover:text-paper-50',
                )}
              >
                {one}
              </button>
            );
          })}
        </div>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              'rounded-md border px-3 py-2',
              SEVERITY_STYLE[result.severity],
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Estimated ΔΔG</span>
              <span className="tabular font-mono text-2xs uppercase tracking-widest">
                {result.severity}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular font-display text-3xl leading-none">
                {result.deltaG >= 0 ? '+' : ''}{formatNumber(result.deltaG, 3)}
              </span>
              <span className="font-mono text-2xs uppercase tracking-widest text-paper-300">kcal/mol</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricBlock label="MJ contact Δ" value={`${result.deltaMJ >= 0 ? '+' : ''}${formatNumber(result.deltaMJ, 3)}`} unit="kcal/mol" tone={result.deltaMJ > 0 ? 'warn' : 'ok'} />
            <MetricBlock label="Volume Δ" value={`${result.deltaVolume >= 0 ? '+' : ''}${formatNumber(result.deltaVolume, 3)}`} unit="Å³" tone={Math.abs(result.deltaVolume) > 25 ? 'warn' : 'ok'} />
            <MetricBlock label="Charge Δ" value={result.deltaCharge === 0 ? '0' : result.deltaCharge > 0 ? `+${result.deltaCharge}` : `${result.deltaCharge}`} tone={result.chargeFlip ? 'warn' : 'ok'} />
          </div>

          <p className="text-pretty text-xs leading-relaxed text-paper-200">
            <span className="eyebrow mr-1">Why:</span>
            {result.rationale}.
          </p>

          <details className="group">
            <summary className="cursor-pointer select-none font-mono text-2xs uppercase tracking-widest text-paper-300 hover:text-paper-100">
              {result.contacts.length} local contacts
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-stage-700/70 bg-stage-900/60 p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left font-mono text-2xs uppercase tracking-widest text-paper-400">
                    <th className="pb-1 pr-3">Partner</th>
                    <th className="pb-1 pr-3 text-right">d (Å)</th>
                    <th className="pb-1 text-right">ΔE (kcal)</th>
                  </tr>
                </thead>
                <tbody className="tabular font-mono text-paper-200">
                  {[...result.contacts].sort((a, b) => b.deltaE - a.deltaE).slice(0, 16).map((c) => (
                    <tr key={`${c.chain}-${c.resi}`}>
                      <td className="py-0.5 pr-3">{c.resn}{c.resi}<span className="text-paper-400"> {c.chain}</span></td>
                      <td className="py-0.5 pr-3 text-right">{c.distance.toFixed(2)}</td>
                      <td
                        className={cn(
                          'py-0.5 text-right',
                          c.deltaE > 0.05 ? 'text-catalytic-terra' : c.deltaE < -0.05 ? 'text-catalytic-verdigris' : 'text-paper-300',
                        )}
                      >
                        {c.deltaE >= 0 ? '+' : ''}{c.deltaE.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <p className="text-2xs leading-relaxed text-paper-400">
            Estimate uses Miyazawa–Jernigan contact energies over the Cα neighborhood plus
            volume / charge / class terms. Directionally useful, but not a substitute for
            FoldX, Rosetta, or MD-based ΔΔG. All arithmetic runs in your browser — no server call.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricBlock({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: 'ok' | 'warn';
}) {
  return (
    <div
      className={cn(
        'rounded border px-2 py-1.5',
        tone === 'warn' ? 'border-catalytic-gold/40 bg-catalytic-gold/5' : 'border-stage-700/70 bg-stage-850/60',
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-paper-400">{label}</div>
      <div className={cn('tabular font-mono text-sm', tone === 'warn' ? 'text-catalytic-gold' : 'text-paper-100')}>
        {value}
        {unit && <span className="ml-1 text-2xs text-paper-400">{unit}</span>}
      </div>
    </div>
  );
}
