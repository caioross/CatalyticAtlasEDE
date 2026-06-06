'use client';

import type { CAAtom } from '@/lib/pdb';
import type { ENMResult } from '@/lib/types';
import ThreeModeViewer from './viewer/ThreeModeViewer';

// Was a Mol* viewer with a three.js fallback. Mol* kept failing to obtain a
// WebGL context on some setups and lit up the Next.js dev error overlay, so
// this is now a thin passthrough to ThreeModeViewer — one code path, no
// fallback chain, never throws a console.error.
type Props = {
  atoms: CAAtom[];
  mode: ENMResult['modes'][number];
  amplitude?: number;
  frames?: number;
  className?: string;
};

export default function ModeViewer({ atoms, mode, amplitude = 6, frames = 28, className }: Props) {
  return (
    <ThreeModeViewer
      atoms={atoms}
      mode={mode}
      amplitude={amplitude}
      frames={frames}
      className={className}
    />
  );
}
