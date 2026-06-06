/**
 * Amino-acid physicochemical reference data for the ResidueInspector
 * and for Miyazawa–Jernigan contact-energy mutation scoring.
 */

export type AAInfo = {
  three: string;
  one: string;
  name: string;
  class: 'acidic' | 'basic' | 'polar' | 'hydrophobic' | 'aromatic' | 'special';
  mw: number; // Da (residue, -H2O)
  pKa?: number; // sidechain
  hydrophobicity: number; // Kyte–Doolittle
  volume: number; // Å^3, Zamyatnin 1972
  chargeAtPh7: -1 | 0 | 1;
};

export const AMINO_ACIDS: Record<string, AAInfo> = {
  ALA: { three: 'ALA', one: 'A', name: 'Alanine',        class: 'hydrophobic', mw:  71.08, hydrophobicity:  1.8, volume:  88.6, chargeAtPh7:  0 },
  ARG: { three: 'ARG', one: 'R', name: 'Arginine',       class: 'basic',       mw: 156.19, pKa: 12.5, hydrophobicity: -4.5, volume: 173.4, chargeAtPh7:  1 },
  ASN: { three: 'ASN', one: 'N', name: 'Asparagine',     class: 'polar',       mw: 114.10, hydrophobicity: -3.5, volume: 114.1, chargeAtPh7:  0 },
  ASP: { three: 'ASP', one: 'D', name: 'Aspartate',      class: 'acidic',      mw: 115.09, pKa:  3.7, hydrophobicity: -3.5, volume: 111.1, chargeAtPh7: -1 },
  CYS: { three: 'CYS', one: 'C', name: 'Cysteine',       class: 'polar',       mw: 103.14, pKa:  8.3, hydrophobicity:  2.5, volume: 108.5, chargeAtPh7:  0 },
  GLN: { three: 'GLN', one: 'Q', name: 'Glutamine',      class: 'polar',       mw: 128.13, hydrophobicity: -3.5, volume: 143.8, chargeAtPh7:  0 },
  GLU: { three: 'GLU', one: 'E', name: 'Glutamate',      class: 'acidic',      mw: 129.12, pKa:  4.3, hydrophobicity: -3.5, volume: 138.4, chargeAtPh7: -1 },
  GLY: { three: 'GLY', one: 'G', name: 'Glycine',        class: 'special',     mw:  57.05, hydrophobicity: -0.4, volume:  60.1, chargeAtPh7:  0 },
  HIS: { three: 'HIS', one: 'H', name: 'Histidine',      class: 'basic',       mw: 137.14, pKa:  6.0, hydrophobicity: -3.2, volume: 153.2, chargeAtPh7:  0 },
  ILE: { three: 'ILE', one: 'I', name: 'Isoleucine',     class: 'hydrophobic', mw: 113.16, hydrophobicity:  4.5, volume: 166.7, chargeAtPh7:  0 },
  LEU: { three: 'LEU', one: 'L', name: 'Leucine',        class: 'hydrophobic', mw: 113.16, hydrophobicity:  3.8, volume: 166.7, chargeAtPh7:  0 },
  LYS: { three: 'LYS', one: 'K', name: 'Lysine',         class: 'basic',       mw: 128.17, pKa: 10.5, hydrophobicity: -3.9, volume: 168.6, chargeAtPh7:  1 },
  MET: { three: 'MET', one: 'M', name: 'Methionine',     class: 'hydrophobic', mw: 131.20, hydrophobicity:  1.9, volume: 162.9, chargeAtPh7:  0 },
  PHE: { three: 'PHE', one: 'F', name: 'Phenylalanine',  class: 'aromatic',    mw: 147.18, hydrophobicity:  2.8, volume: 189.9, chargeAtPh7:  0 },
  PRO: { three: 'PRO', one: 'P', name: 'Proline',        class: 'special',     mw:  97.12, hydrophobicity: -1.6, volume: 112.7, chargeAtPh7:  0 },
  SER: { three: 'SER', one: 'S', name: 'Serine',         class: 'polar',       mw:  87.08, hydrophobicity: -0.8, volume:  89.0, chargeAtPh7:  0 },
  THR: { three: 'THR', one: 'T', name: 'Threonine',      class: 'polar',       mw: 101.10, hydrophobicity: -0.7, volume: 116.1, chargeAtPh7:  0 },
  TRP: { three: 'TRP', one: 'W', name: 'Tryptophan',     class: 'aromatic',    mw: 186.21, hydrophobicity: -0.9, volume: 227.8, chargeAtPh7:  0 },
  TYR: { three: 'TYR', one: 'Y', name: 'Tyrosine',       class: 'aromatic',    mw: 163.18, pKa: 10.1, hydrophobicity: -1.3, volume: 193.6, chargeAtPh7:  0 },
  VAL: { three: 'VAL', one: 'V', name: 'Valine',         class: 'hydrophobic', mw:  99.13, hydrophobicity:  4.2, volume: 140.0, chargeAtPh7:  0 },
};

export const AA_ORDER: string[] = ['A','R','N','D','C','Q','E','G','H','I','L','K','M','F','P','S','T','W','Y','V'];

export function aaOneToInfo(one: string): AAInfo | null {
  const entry = Object.values(AMINO_ACIDS).find((a) => a.one === one);
  return entry ?? null;
}

export function aaThreeToInfo(three: string): AAInfo | null {
  return AMINO_ACIDS[three.toUpperCase()] ?? null;
}

/**
 * Miyazawa–Jernigan contact potentials (table 3, 1996; kcal/mol).
 * Stored as upper-triangular: MJ_UPPER[i] has (20 - i) values starting at column i.
 * Indices follow AA_ORDER.
 */
// prettier-ignore
const MJ_UPPER: number[][] = [
  [-0.52,-0.30,-0.34,-0.33,-1.19,-0.25,-0.29,-0.31,-0.49,-1.04,-1.10,-0.29,-1.00,-1.19,-0.36,-0.25,-0.33,-1.28,-1.11,-0.88], // A-X (20)
  [-0.13,-0.50,-1.29, 0.21,-0.42,-1.50,-0.14,-0.43,-0.51,-0.57, 0.28,-0.63,-0.94,-0.06,-0.29,-0.44,-1.03,-0.94,-0.52],       // R-X (19)
  [-0.29,-0.22,-0.47,-0.30,-0.28,-0.17,-0.57,-0.36,-0.50,-0.22,-0.49,-0.77,-0.20,-0.16,-0.28,-0.90,-0.96,-0.30],             // N-X (18)
  [-0.06,-0.21,-0.30,-0.09, 0.00,-0.74,-0.18,-0.16,-1.14,-0.45,-0.71,-0.10,-0.26,-0.16,-0.84,-0.78,-0.20],                   // D-X (17)
  [-3.67,-0.62,-0.20,-0.73,-1.34,-1.84,-1.90,-0.44,-1.77,-1.88,-0.98,-0.69,-0.95,-1.62,-1.72,-1.82],                         // C-X (16)
  [-0.17,-0.22,-0.07,-0.47,-0.29,-0.41,-0.26,-0.62,-0.82,-0.22,-0.13,-0.32,-0.90,-0.76,-0.26],                               // Q-X (15)
  [-0.01,-0.10,-0.55,-0.19,-0.10,-1.31,-0.30,-0.72,-0.17,-0.19,-0.19,-0.75,-0.75,-0.17],                                     // E-X (14)
  [ 0.15,-0.44,-0.34,-0.34,-0.13,-0.36,-0.75,-0.04,-0.11,-0.09,-0.98,-0.75,-0.12],                                           // G-X (13)
  [-0.78,-0.94,-1.01,-0.46,-0.86,-1.22,-0.63,-0.53,-0.72,-1.37,-1.13,-0.71],                                                 // H-X (12)
  [-2.56,-2.76,-0.32,-2.67,-3.00,-1.13,-1.09,-1.20,-2.31,-2.39,-2.34],                                                       // I-X (11)
  [-2.77,-0.38,-2.43,-2.95,-1.16,-1.03,-1.30,-2.68,-2.34,-2.47],                                                             // L-X (10)
  [ 0.03,-0.64,-0.73, 0.01,-0.13,-0.17,-1.00,-0.95,-0.19],                                                                   // K-X  (9)
  [-2.54,-2.70,-0.81,-1.02,-1.07,-2.30,-1.99,-2.11],                                                                         // M-X  (8)
  [-2.98,-1.24,-1.14,-1.27,-2.48,-2.53,-2.49],                                                                               // F-X  (7)
  [-0.31,-0.38,-0.55,-1.39,-1.05,-0.91],                                                                                     // P-X  (6)
  [-0.03,-0.19,-0.95,-0.76,-0.39],                                                                                           // S-X  (5)
  [-0.20,-0.88,-0.76,-0.52],                                                                                                 // T-X  (4)
  [-1.80,-1.46,-1.88],                                                                                                       // W-X  (3)
  [-1.11,-1.67],                                                                                                             // Y-X  (2)
  [-1.84],                                                                                                                   // V-V  (1)
];

function aaIndex(one: string): number {
  return AA_ORDER.indexOf(one);
}

export function mjContact(a: string, b: string): number {
  const i = aaIndex(a);
  const j = aaIndex(b);
  if (i < 0 || j < 0) return 0;
  const [lo, hi] = i <= j ? [i, j] : [j, i];
  // row `lo` starts at column `lo`, so offset is (hi - lo)
  return MJ_UPPER[lo]?.[hi - lo] ?? 0;
}
