// Per-residue colour palettes shared across the viewer.
//
// The main export is `computeCaColors(atoms, ss, scheme)`, which returns a
// Float32Array of length 3N where N is the number of Cα atoms. Downstream
// modules (cartoon, surface, ball-and-stick) pick up the same array so
// switching colour scheme only costs one re-colour pass — not a rebuild.

import * as THREE from 'three';
import type { CAAtom } from '@/lib/pdb';
import type { SSCode } from './ss';

export type ViewerColor =
  | 'chain-id'
  | 'secondary-structure'
  | 'hydrophobicity'
  | 'residue-name'
  | 'element-symbol'
  | 'sequence-id'
  | 'uniform';

export const CATALYTIC_PALETTE = [0xe8b86d, 0xd4613a, 0x4e9e8c, 0x8b5a9f, 0xc4a775, 0x7ba8a3];
export const CHAIN_PALETTE = [0xe8b86d, 0x4e9e8c, 0xd4613a, 0x8b5a9f, 0xc4a775, 0x7ba8a3, 0xb88a55, 0xe07a5f];

const SEQ_GRADIENT: [number, THREE.Color][] = [
  [0.0, new THREE.Color(0xd4613a)],
  [0.5, new THREE.Color(0xc4a775)],
  [1.0, new THREE.Color(0xe8b86d)],
];

function sampleGradient(t: number, out: THREE.Color): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < SEQ_GRADIENT.length - 1; i++) {
    const [t0, c0] = SEQ_GRADIENT[i];
    const [t1, c1] = SEQ_GRADIENT[i + 1];
    if (clamped <= t1) {
      const local = (clamped - t0) / (t1 - t0 || 1);
      return out.copy(c0).lerp(c1, local);
    }
  }
  return out.copy(SEQ_GRADIENT[SEQ_GRADIENT.length - 1][1]);
}

const HYDROPHOBICITY: Record<string, number> = {
  ILE: 4.5, VAL: 4.2, LEU: 3.8, PHE: 2.8, CYS: 2.5, MET: 1.9, ALA: 1.8,
  GLY: -0.4, THR: -0.7, SER: -0.8, TRP: -0.9, TYR: -1.3, PRO: -1.6,
  HIS: -3.2, GLU: -3.5, GLN: -3.5, ASP: -3.5, ASN: -3.5, LYS: -3.9, ARG: -4.5,
};

const RESIDUE_CLASS: Record<string, number> = {
  ALA: 0xc4a775, ILE: 0xc4a775, LEU: 0xc4a775, VAL: 0xc4a775, MET: 0xc4a775,
  PHE: 0xc4a775, PRO: 0xc4a775, TRP: 0xc4a775,
  SER: 0x7ba8a3, THR: 0x7ba8a3, CYS: 0x7ba8a3, TYR: 0x7ba8a3, ASN: 0x7ba8a3,
  GLN: 0x7ba8a3, GLY: 0x7ba8a3,
  LYS: 0x4e9e8c, ARG: 0x4e9e8c, HIS: 0x4e9e8c,
  ASP: 0xd4613a, GLU: 0xd4613a,
};

const SS_COLOR: Record<SSCode, number> = {
  H: 0xd4613a, // helix → terra
  E: 0xe8b86d, // sheet → gold
  C: 0x7ba8a3, // coil → sage
};

function chainIndexMap(atoms: CAAtom[]): Map<string, number> {
  const chains = new Set<string>();
  for (const a of atoms) chains.add(a.chain);
  const list = Array.from(chains).sort();
  const map = new Map<string, number>();
  list.forEach((c, i) => map.set(c, i));
  return map;
}

export function computeCaColors(
  atoms: CAAtom[],
  ss: SSCode[] | undefined,
  scheme: ViewerColor,
): Float32Array {
  const N = atoms.length;
  const out = new Float32Array(N * 3);
  const c = new THREE.Color();
  const chainIdx = chainIndexMap(atoms);

  for (let i = 0; i < N; i++) {
    const a = atoms[i];
    const t = N > 1 ? i / (N - 1) : 0;
    switch (scheme) {
      case 'chain-id': {
        const ci = chainIdx.get(a.chain) ?? 0;
        c.setHex(CHAIN_PALETTE[ci % CHAIN_PALETTE.length]);
        break;
      }
      case 'sequence-id':
        sampleGradient(t, c);
        break;
      case 'hydrophobicity': {
        const h = HYDROPHOBICITY[a.resn.toUpperCase()] ?? 0;
        const tt = (h + 4.5) / 9;
        sampleGradient(1 - tt, c);
        break;
      }
      case 'residue-name':
        c.setHex(RESIDUE_CLASS[a.resn.toUpperCase()] ?? 0xc4a775);
        break;
      case 'secondary-structure': {
        const code: SSCode = ss?.[i] ?? 'C';
        c.setHex(SS_COLOR[code]);
        break;
      }
      case 'element-symbol':
        // CA only → all carbon. We just use a warm neutral.
        c.setHex(0xc4a775);
        break;
      case 'uniform':
      default:
        c.setHex(0xe8b86d);
        break;
    }
    out[i * 3 + 0] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  return out;
}
