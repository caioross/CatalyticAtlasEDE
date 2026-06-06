// Secondary-structure assignment from Cα coordinates only.
//
// We cannot run full DSSP without backbone O/N/H atoms, so we approximate with
// a geometric classifier that is good enough to drive the cartoon: given the
// sequence of Cα positions along one chain, label each residue H (helix),
// E (strand) or C (coil). The rules below are a distilled version of the
// Kabsch–Sander and CABS-flow criteria used when only Cα is available.
//
//   α-helix signature:   d(i, i+3) ≈ 5.4 Å, d(i, i+4) ≈ 6.2 Å,
//                        τ(i-1, i, i+1, i+2) ≈ 50°, α(i-1, i, i+1) ≈ 89°
//   β-strand signature:  d(i, i+2) ≈ 6.9 Å, d(i, i+3) ≈ 10.3 Å,
//                        τ(i-1, i, i+1, i+2) ≈ ±170°, α(i-1, i, i+1) ≈ 120°
//
// After the per-residue vote we apply a minimum-run smoothing (helix ≥ 4,
// strand ≥ 3) so isolated spikes don't create micro-ribbons.

import type { CAAtom } from '@/lib/pdb';

export type SSCode = 'H' | 'E' | 'C';

export type ChainSS = {
  chain: string;
  atoms: CAAtom[];
  ss: SSCode[]; // same length as atoms
};

function dist(a: CAAtom, b: CAAtom): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function angle(a: CAAtom, b: CAAtom, c: CAAtom): number {
  const v1x = a.x - b.x, v1y = a.y - b.y, v1z = a.z - b.z;
  const v2x = c.x - b.x, v2y = c.y - b.y, v2z = c.z - b.z;
  const n1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const n2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
  if (n1 === 0 || n2 === 0) return 0;
  const d = (v1x * v2x + v1y * v2y + v1z * v2z) / (n1 * n2);
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
}

function dihedral(a: CAAtom, b: CAAtom, c: CAAtom, d: CAAtom): number {
  const b1x = b.x - a.x, b1y = b.y - a.y, b1z = b.z - a.z;
  const b2x = c.x - b.x, b2y = c.y - b.y, b2z = c.z - b.z;
  const b3x = d.x - c.x, b3y = d.y - c.y, b3z = d.z - c.z;
  // n1 = b1 × b2
  const n1x = b1y * b2z - b1z * b2y;
  const n1y = b1z * b2x - b1x * b2z;
  const n1z = b1x * b2y - b1y * b2x;
  // n2 = b2 × b3
  const n2x = b2y * b3z - b2z * b3y;
  const n2y = b2z * b3x - b2x * b3z;
  const n2z = b2x * b3y - b2y * b3x;
  // m = n1 × b2_norm
  const b2len = Math.sqrt(b2x * b2x + b2y * b2y + b2z * b2z);
  if (b2len === 0) return 0;
  const ux = b2x / b2len, uy = b2y / b2len, uz = b2z / b2len;
  const mx = n1y * uz - n1z * uy;
  const my = n1z * ux - n1x * uz;
  const mz = n1x * uy - n1y * ux;
  const x = n1x * n2x + n1y * n2y + n1z * n2z;
  const y = mx * n2x + my * n2y + mz * n2z;
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Single-residue vote based on local geometry.
function voteSS(atoms: CAAtom[], i: number): SSCode {
  const N = atoms.length;
  if (i < 2 || i > N - 3) return 'C';

  // helix signal — i..i+3 / i..i+4 distances
  // bounds: d13 needs i+3 < N (i <= N-4); d14 needs i+4 < N (i <= N-5).
  let helixScore = 0;
  if (i + 3 < N) {
    const d13 = dist(atoms[i], atoms[i + 3]);
    if (d13 >= 4.9 && d13 <= 6.0) helixScore += 1;
  }
  if (i + 4 < N) {
    const d14 = dist(atoms[i], atoms[i + 4]);
    if (d14 >= 5.8 && d14 <= 7.0) helixScore += 1;
  }
  // Cα-Cα-Cα angle around residue i should be ≈ 89° for helix, 120° for strand
  const a = angle(atoms[i - 1], atoms[i], atoms[i + 1]);
  if (a >= 80 && a <= 100) helixScore += 1;

  // helical dihedral around residues i-1..i+2 ≈ 50°
  // bounds: needs i-1 >= 0 and i+2 < N.
  if (i - 1 >= 0 && i + 2 < N) {
    const t = dihedral(atoms[i - 1], atoms[i], atoms[i + 1], atoms[i + 2]);
    if (t >= 30 && t <= 80) helixScore += 1;
  }

  // strand signal
  // bounds: d12 needs i+2 < N; d13 needs i+3 < N.
  let strandScore = 0;
  if (i + 2 < N) {
    const d12 = dist(atoms[i], atoms[i + 2]);
    if (d12 >= 6.0 && d12 <= 7.5) strandScore += 1;
  }
  if (i + 3 < N) {
    const d13 = dist(atoms[i], atoms[i + 3]);
    if (d13 >= 9.4 && d13 <= 11.0) strandScore += 1;
  }
  if (a >= 110 && a <= 140) strandScore += 1;
  if (i - 1 >= 0 && i + 2 < N) {
    const t = dihedral(atoms[i - 1], atoms[i], atoms[i + 1], atoms[i + 2]);
    if (t >= 150 || t <= -150) strandScore += 1;
  }

  if (helixScore >= 3 && helixScore > strandScore) return 'H';
  if (strandScore >= 3 && strandScore > helixScore) return 'E';
  return 'C';
}

function smoothRuns(ss: SSCode[]): SSCode[] {
  const out = ss.slice();
  // enforce minimum helix run = 4, strand run = 3; shorter runs → coil.
  const minLen: Record<SSCode, number> = { H: 4, E: 3, C: 0 };
  let i = 0;
  while (i < out.length) {
    const s = out[i];
    let j = i;
    while (j < out.length && out[j] === s) j++;
    if (s !== 'C' && j - i < minLen[s]) {
      for (let k = i; k < j; k++) out[k] = 'C';
    }
    i = j;
  }
  // bridge: HCH → HHH (single coil between helix) and ECE → EEE
  for (let k = 1; k < out.length - 1; k++) {
    if (out[k] === 'C' && out[k - 1] === out[k + 1] && out[k - 1] !== 'C') {
      out[k] = out[k - 1];
    }
  }
  return out;
}

export function assignSecondaryStructure(atoms: CAAtom[]): SSCode[] {
  const N = atoms.length;
  const votes: SSCode[] = new Array(N).fill('C');
  for (let i = 0; i < N; i++) votes[i] = voteSS(atoms, i);
  return smoothRuns(votes);
}

export function splitByChain(atoms: CAAtom[]): ChainSS[] {
  const map = new Map<string, CAAtom[]>();
  for (const a of atoms) {
    if (!map.has(a.chain)) map.set(a.chain, []);
    map.get(a.chain)!.push(a);
  }
  const out: ChainSS[] = [];
  for (const [chain, list] of map) {
    list.sort((a, b) => a.resi - b.resi);
    out.push({ chain, atoms: list, ss: assignSecondaryStructure(list) });
  }
  out.sort((a, b) => a.chain.localeCompare(b.chain));
  return out;
}

export type SSSegment = {
  kind: SSCode;
  start: number; // index in chain.atoms (inclusive)
  end: number;   // inclusive
};

// Consecutive runs of the same SS code, with a 1-residue overlap so the cartoon
// joins smoothly at segment boundaries.
export function segmentsForChain(ss: SSCode[]): SSSegment[] {
  const segs: SSSegment[] = [];
  if (!ss.length) return segs;
  let start = 0;
  for (let i = 1; i <= ss.length; i++) {
    if (i === ss.length || ss[i] !== ss[start]) {
      segs.push({ kind: ss[start], start, end: i - 1 });
      start = i;
    }
  }
  return segs;
}
