'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CatalyticResidue } from '@/lib/types';

type HighlightSpec = {
  chain: string;
  resi: number;
  color?: string;
  label?: string;
};

export type MolViewerProps = {
  pdbId?: string;
  pdbText?: string;
  highlight?: HighlightSpec[];
  catalyticResidues?: CatalyticResidue[];
  backgroundColor?: string;
  showSurface?: boolean;
  className?: string;
  style?: 'cartoon' | 'cartoon+sticks' | 'backbone' | 'ribbon';
  spin?: boolean;
  onReady?: () => void;
};

const CATALYTIC_COLORS = ['#f7b955', '#56d1ff', '#9dff6b', '#ff6b8b', '#b47bff', '#ffd36b'];

export default function MolViewer({
  pdbId,
  pdbText,
  highlight,
  catalyticResidues,
  backgroundColor = '#07080a',
  showSurface = false,
  className,
  style = 'cartoon+sticks',
  spin = false,
  onReady,
}: MolViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Initialising viewer…');

  useEffect(() => {
    let cancelled = false;
    let viewer: any = null;

    (async () => {
      try {
        setStatus('loading');
        setMessage('Loading 3Dmol…');
        const mod: any = await import('3dmol/build/3Dmol.js');
        const $3Dmol = mod.default ?? mod;
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = '';
        viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor,
          antialias: true,
          defaultcolors: $3Dmol.rasmolElementColors ?? $3Dmol.elementColors?.rasmol,
        });
        viewerRef.current = viewer;

        let data: string | undefined = pdbText;
        if (!data && pdbId) {
          setMessage(`Fetching ${pdbId.toUpperCase()} from RCSB…`);
          const r = await fetch(`https://files.rcsb.org/download/${pdbId.toLowerCase()}.pdb`);
          if (!r.ok) throw new Error(`Failed to fetch PDB ${pdbId} (${r.status})`);
          data = await r.text();
        }
        if (!data) throw new Error('No structure source provided.');
        if (cancelled) return;

        setMessage('Parsing structure…');
        viewer.addModel(data, 'pdb');

        viewer.setStyle({}, { cartoon: { color: 'spectrum', thickness: 0.35 } });
        if (style === 'cartoon+sticks') {
          viewer.setStyle({ hetflag: true, invert: true }, { cartoon: { color: 'spectrum' } });
        }
        if (style === 'backbone') {
          viewer.setStyle({}, { line: { color: 'spectrum' } });
        }
        if (style === 'ribbon') {
          viewer.setStyle({}, { cartoon: { color: 'spectrum', style: 'trace' } });
        }

        const heteroSel = { hetflag: true, resn: ['HOH', 'WAT', 'H2O'], invert: true };
        viewer.setStyle(heteroSel, { stick: { colorscheme: 'cyanCarbon', radius: 0.2 } });

        const catResidues = highlight ?? catalyticResidues?.map((r, i) => ({
          chain: r.chain,
          resi: r.resi,
          color: CATALYTIC_COLORS[i % CATALYTIC_COLORS.length],
          label: `${r.resn}${r.resi}`,
        })) ?? [];

        for (const h of catResidues) {
          const sel = { chain: h.chain, resi: h.resi };
          const color = h.color ?? '#f7b955';
          viewer.setStyle(sel, {
            stick: { color, radius: 0.3 },
            cartoon: { color, thickness: 0.5 },
          });
          if (h.label) {
            try {
              viewer.addResLabels(sel, {
                backgroundColor: 'black',
                backgroundOpacity: 0.7,
                fontColor: color,
                fontSize: 12,
                borderThickness: 0,
              });
            } catch {
              /* label failure is non-fatal */
            }
          }
        }

        if (showSurface) {
          try {
            viewer.addSurface($3Dmol.SurfaceType.MS, { opacity: 0.35, color: '#2a3042' });
          } catch {
            /* surface can be heavy */
          }
        }

        viewer.zoomTo();
        viewer.render();
        if (spin) viewer.spin('y', 0.4);

        if (cancelled) return;
        setStatus('ready');
        setMessage('');
        onReady?.();
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err?.message ?? 'Unknown error');
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.clear?.();
        viewerRef.current?.removeAllModels?.();
      } catch {
        /* noop */
      }
      viewerRef.current = null;
    };
  }, [pdbId, pdbText, JSON.stringify(highlight ?? null), JSON.stringify(catalyticResidues ?? null), backgroundColor, showSurface, style, spin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-ink-700 bg-ink-950', className)}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: 400 }} />
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
          <div className="text-center">
            <div className={cn(
              'mb-2 inline-block h-8 w-8 rounded-full border-2 border-ink-600 border-t-accent-cyan',
              status === 'loading' ? 'animate-spin' : '',
            )} />
            <div className={cn(
              'font-mono text-xs',
              status === 'error' ? 'text-accent-rose' : 'text-ink-300',
            )}>
              {message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
