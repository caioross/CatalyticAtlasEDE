'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ViewerRepresentation, ViewerColor } from './MolstarViewer';

type Props = {
  representation: ViewerRepresentation;
  color: ViewerColor;
  spinning: boolean;
  onRepresentationChange: (rep: ViewerRepresentation) => void;
  onColorChange: (color: ViewerColor) => void;
  onToggleSpin: () => void;
  onScreenshot: () => void;
  onResetView?: () => void;
  className?: string;
};

const REPS: { value: ViewerRepresentation; label: string; hint: string }[] = [
  { value: 'cartoon+surface', label: 'Cartoon + Surface', hint: 'Fold traced over a translucent molecular envelope' },
  { value: 'molecular-surface', label: 'Solvent Surface', hint: 'SES surface — the face the solvent actually sees' },
  { value: 'gaussian-surface', label: 'Gaussian Surface', hint: 'Smoothed density envelope' },
  { value: 'cartoon', label: 'Cartoon', hint: 'Secondary structure ribbon' },
  { value: 'ball-and-stick', label: 'Ball & Stick', hint: 'Full atomistic detail' },
  { value: 'spacefill', label: 'Spacefill', hint: 'van der Waals spheres' },
];

const COLORS: { value: ViewerColor; label: string }[] = [
  { value: 'chain-id', label: 'Chain' },
  { value: 'secondary-structure', label: 'Secondary structure' },
  { value: 'hydrophobicity', label: 'Hydrophobicity' },
  { value: 'residue-name', label: 'Residue' },
  { value: 'element-symbol', label: 'Element' },
  { value: 'sequence-id', label: 'Sequence position' },
  { value: 'uniform', label: 'Uniform' },
];

export default function ViewerControls({
  representation,
  color,
  spinning,
  onRepresentationChange,
  onColorChange,
  onToggleSpin,
  onScreenshot,
  onResetView,
  className,
}: Props) {
  const [repOpen, setRepOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const activeRep = REPS.find((r) => r.value === representation);
  const activeColor = COLORS.find((c) => c.value === color);

  return (
    <div
      className={cn(
        'pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-md border border-stage-700/70 bg-stage-900/85 p-1.5 backdrop-blur',
        className,
      )}
    >
      <Dropdown
        label="Style"
        current={activeRep?.label ?? representation}
        open={repOpen}
        onOpenChange={(v) => {
          setRepOpen(v);
          if (v) setColorOpen(false);
        }}
      >
        {REPS.map((r) => (
          <button
            key={r.value}
            onClick={() => {
              onRepresentationChange(r.value);
              setRepOpen(false);
            }}
            className={cn(
              'group flex w-full flex-col items-start gap-0.5 rounded px-3 py-2 text-left transition hover:bg-stage-700/80',
              r.value === representation && 'bg-stage-700/50',
            )}
          >
            <span
              className={cn(
                'font-mono text-xs uppercase tracking-wider',
                r.value === representation ? 'text-catalytic-gold' : 'text-paper-100',
              )}
            >
              {r.label}
            </span>
            <span className="text-2xs text-paper-300">{r.hint}</span>
          </button>
        ))}
      </Dropdown>

      <Dropdown
        label="Color"
        current={activeColor?.label ?? color}
        open={colorOpen}
        onOpenChange={(v) => {
          setColorOpen(v);
          if (v) setRepOpen(false);
        }}
      >
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              onColorChange(c.value);
              setColorOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded px-3 py-1.5 text-left transition hover:bg-stage-700/80',
              c.value === color && 'bg-stage-700/50',
            )}
          >
            <span
              className={cn(
                'font-mono text-xs',
                c.value === color ? 'text-catalytic-gold' : 'text-paper-100',
              )}
            >
              {c.label}
            </span>
          </button>
        ))}
      </Dropdown>

      <div className="mx-1 h-5 w-px bg-stage-700" />

      <button className="btn-quiet" onClick={onToggleSpin} title={spinning ? 'Pause rotation' : 'Rotate model'}>
        {spinning ? 'Pause' : 'Spin'}
      </button>

      {onResetView && (
        <button className="btn-quiet" onClick={onResetView} title="Reset camera">
          Reset
        </button>
      )}

      <button className="btn-quiet" onClick={onScreenshot} title="Download a PNG screenshot">
        Capture
      </button>
    </div>
  );
}

function Dropdown({
  label,
  current,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  current: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex items-center gap-2 rounded px-2.5 py-1.5 transition',
          open ? 'bg-stage-700/80' : 'hover:bg-stage-800',
        )}
      >
        <span className="font-mono text-2xs uppercase tracking-widest text-paper-300">{label}</span>
        <span className="font-mono text-xs text-paper-100">{current}</span>
        <svg
          className={cn('h-3 w-3 text-paper-300 transition', open && 'rotate-180')}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-stage-700 bg-stage-900 p-1 shadow-lift">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
