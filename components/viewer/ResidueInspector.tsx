'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { aaThreeToInfo } from '@/lib/residues';
import type { ResidueSelection } from './MolstarViewer';

type Props = {
  selection: ResidueSelection | null;
  onClose: () => void;
  onFocus?: (s: ResidueSelection) => void;
  onMutate?: (s: ResidueSelection) => void;
  onMarkForPath?: (s: ResidueSelection) => void;
  catalyticNote?: string;
  pathMarkerLabel?: 'Start' | 'End' | null;
  className?: string;
};

const CLASS_STYLE: Record<string, string> = {
  acidic: 'bg-catalytic-terra/15 text-catalytic-terra border-catalytic-terra/30',
  basic: 'bg-catalytic-plum/15 text-catalytic-plum border-catalytic-plum/30',
  polar: 'bg-catalytic-sage/15 text-catalytic-sage border-catalytic-sage/30',
  hydrophobic: 'bg-catalytic-gold/15 text-catalytic-gold border-catalytic-gold/30',
  aromatic: 'bg-catalytic-verdigris/15 text-catalytic-verdigris border-catalytic-verdigris/30',
  special: 'bg-stage-600/40 text-paper-200 border-stage-500/40',
};

export default function ResidueInspector({
  selection,
  onClose,
  onFocus,
  onMutate,
  onMarkForPath,
  catalyticNote,
  pathMarkerLabel,
  className,
}: Props) {
  const info = useMemo(() => (selection?.resn ? aaThreeToInfo(selection.resn) : null), [selection?.resn]);

  if (!selection) return null;

  const title = info ? `${info.name}` : selection.resn ?? 'Residue';
  const threeCode = info ? info.three : selection.resn ?? '?';
  const oneCode = info ? info.one : '?';

  return (
    <div
      className={cn(
        'pointer-events-auto w-[320px] rounded-lg border border-stage-700 bg-stage-900/95 p-4 shadow-lift backdrop-blur animate-fade-in',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none text-paper-50">{threeCode}</span>
            <span className="font-mono text-sm text-paper-300">{oneCode}</span>
          </div>
          <div className="mt-0.5 font-display text-sm italic text-paper-300">{title}</div>
          <div className="mt-1 font-mono text-2xs uppercase tracking-widest text-paper-400">
            chain {selection.chain} · resi {selection.resi}
            {selection.atomName ? <> · atom {selection.atomName}</> : null}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-paper-400 transition hover:bg-stage-700 hover:text-paper-100"
          aria-label="Close"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {pathMarkerLabel && (
        <div className="mt-2 rounded border border-catalytic-verdigris/40 bg-catalytic-verdigris/10 px-2 py-1 font-mono text-2xs uppercase tracking-widest text-catalytic-verdigris">
          Path {pathMarkerLabel}
        </div>
      )}

      {info && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-widest',
                CLASS_STYLE[info.class],
              )}
            >
              {info.class}
            </span>
            {info.chargeAtPh7 !== 0 && (
              <span className="kicker">
                {info.chargeAtPh7 > 0 ? 'charge +1' : 'charge −1'}
              </span>
            )}
            {info.pKa !== undefined && (
              <span className="kicker">pKa ≈ {info.pKa}</span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="MW" value={`${info.mw.toFixed(1)}`} unit="Da" />
            <Stat label="Volume" value={`${info.volume.toFixed(0)}`} unit="Å³" />
            <Stat label="Hφ" value={`${info.hydrophobicity > 0 ? '+' : ''}${info.hydrophobicity.toFixed(1)}`} unit="KD" />
          </div>
        </>
      )}

      {catalyticNote && (
        <div className="mt-3 rounded-md border border-catalytic-gold/30 bg-catalytic-gold/5 p-3">
          <div className="eyebrow text-catalytic-gold">Catalytic role</div>
          <p className="mt-1 text-xs leading-relaxed text-paper-100">{catalyticNote}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {onFocus && (
          <button className="btn-quiet" onClick={() => onFocus(selection)}>
            Focus
          </button>
        )}
        {onMutate && info && (
          <button className="btn-quiet" onClick={() => onMutate(selection)}>
            Mutate
          </button>
        )}
        {onMarkForPath && (
          <button className="btn-quiet" onClick={() => onMarkForPath(selection)}>
            Use for pathway
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded border border-stage-700/70 bg-stage-850/60 px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-paper-400">{label}</div>
      <div className="tabular font-mono text-sm text-paper-100">
        {value}
        {unit && <span className="ml-1 text-2xs text-paper-400">{unit}</span>}
      </div>
    </div>
  );
}
