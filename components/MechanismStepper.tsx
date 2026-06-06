'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MechanismDoc, MechanismStep } from '@/lib/types';

type Props = {
  mechanism: MechanismDoc;
  onStepChange?: (step: MechanismStep | null) => void;
};

export default function MechanismStepper({ mechanism, onStepChange }: Props) {
  const [current, setCurrent] = useState(0);
  const step = mechanism.steps[current];

  function go(delta: number) {
    const next = Math.min(Math.max(current + delta, 0), mechanism.steps.length - 1);
    setCurrent(next);
    onStepChange?.(mechanism.steps[next]);
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="eyebrow">Catalytic mechanism</div>
          <div className="mt-1 text-sm text-paper-100">
            <span className="text-paper-400">Type: </span>
            <span className="text-paper-50">{mechanism.mechanismType}</span>
          </div>
          {mechanism.rateLimitingStep && (
            <div className="mt-0.5 text-xs text-paper-200">
              <span className="text-paper-400">Rate-limiting: </span>
              {mechanism.rateLimitingStep}
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
        <div className="eyebrow">Overall reaction</div>
        <div className="mt-1 font-mono text-xs text-paper-200">{mechanism.overallReaction}</div>
      </div>

      <div className="mb-4 flex gap-1">
        {mechanism.steps.map((s, i) => (
          <button
            key={s.index}
            onClick={() => {
              setCurrent(i);
              onStepChange?.(s);
            }}
            className={cn(
              'h-1.5 flex-1 rounded-full transition',
              i === current ? 'bg-catalytic-gold' : i < current ? 'bg-paper-400' : 'bg-stage-700',
            )}
            aria-label={`Go to step ${s.index}`}
          />
        ))}
      </div>

      <div className="min-h-[240px] animate-fade-in">
        <div className="mb-2 flex items-baseline gap-3">
          <div className="tabular font-display text-4xl leading-none text-catalytic-gold">
            {String(step.index).padStart(2, '0')}
          </div>
          <h3 className="font-display text-xl text-paper-50">{step.title}</h3>
        </div>
        <p className="mb-3 leading-relaxed text-paper-100 text-pretty">{step.description}</p>

        {step.highlightResidues.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {step.highlightResidues.map((r) => (
              <span key={`${r.chain}-${r.resi}`} className="kicker">
                {r.chain}:{r.resi}
              </span>
            ))}
          </div>
        )}

        {step.notes && (
          <div className="flex gap-2 rounded-md border border-stage-700/60 bg-stage-900/60 p-3 text-xs text-paper-200">
            <Info size={14} className="mt-0.5 shrink-0 text-catalytic-gold" />
            <span>{step.notes}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => go(-1)} disabled={current === 0} className="btn disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft size={14} />
          Previous
        </button>
        <div className="font-mono text-2xs uppercase tracking-widest text-paper-400">
          Step {current + 1} / {mechanism.steps.length}
        </div>
        <button onClick={() => go(1)} disabled={current === mechanism.steps.length - 1} className="btn disabled:cursor-not-allowed disabled:opacity-40">
          Next
          <ChevronRight size={14} />
        </button>
      </div>

      {mechanism.references?.length > 0 && (
        <details className="mt-4 border-t border-stage-700/60 pt-3 text-xs">
          <summary className="cursor-pointer font-mono text-2xs uppercase tracking-widest text-paper-400 hover:text-paper-200">
            References ({mechanism.references.length})
          </summary>
          <ul className="mt-2 space-y-1.5 text-paper-200">
            {mechanism.references.map((r, i) => (
              <li key={i}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-catalytic-gold underline-offset-2 hover:underline">
                    {r.citation}
                  </a>
                ) : (
                  r.citation
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
