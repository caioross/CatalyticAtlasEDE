export type CAAtom = {
  chain: string;
  resi: number;
  resn: string;
  x: number;
  y: number;
  z: number;
  bfactor?: number;
};

const THREE_TO_ONE: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C',
  GLU: 'E', GLN: 'Q', GLY: 'G', HIS: 'H', ILE: 'I',
  LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P',
  SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
};

export function aaThreeToOne(r: string): string {
  return THREE_TO_ONE[r.toUpperCase()] ?? 'X';
}

export function parsePdbCA(text: string): CAAtom[] {
  const out: CAAtom[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.startsWith('ATOM') && !raw.startsWith('HETATM')) continue;
    const atomName = raw.substring(12, 16).trim();
    if (atomName !== 'CA') continue;

    const altLoc = raw.substring(16, 17).trim();
    if (altLoc && altLoc !== 'A') continue;

    const resn = raw.substring(17, 20).trim();
    if (!THREE_TO_ONE[resn.toUpperCase()]) continue;

    const chain = raw.substring(21, 22).trim() || 'A';
    const resi = parseInt(raw.substring(22, 26).trim(), 10);
    if (Number.isNaN(resi)) continue;

    const key = `${chain}:${resi}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const x = parseFloat(raw.substring(30, 38));
    const y = parseFloat(raw.substring(38, 46));
    const z = parseFloat(raw.substring(46, 54));
    const bRaw = raw.substring(60, 66).trim();
    const bfactor = bRaw ? parseFloat(bRaw) : undefined;

    if ([x, y, z].some((v) => Number.isNaN(v))) continue;
    out.push({ chain, resi, resn, x, y, z, bfactor });
  }

  return out;
}

export async function fetchPdbText(pdbId: string): Promise<string> {
  const clean = pdbId.trim().toLowerCase();
  const urls = [
    `https://files.rcsb.org/download/${clean}.pdb`,
    `https://files.rcsb.org/view/${clean}.pdb`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch {
      /* try next */
    }
  }
  throw new Error(`Unable to fetch ${pdbId} from RCSB.`);
}

export function summarizeChains(atoms: CAAtom[]): { chain: string; length: number; firstResi: number; lastResi: number }[] {
  const byChain = new Map<string, CAAtom[]>();
  for (const a of atoms) {
    if (!byChain.has(a.chain)) byChain.set(a.chain, []);
    byChain.get(a.chain)!.push(a);
  }
  return Array.from(byChain.entries())
    .map(([chain, list]) => ({
      chain,
      length: list.length,
      firstResi: list[0].resi,
      lastResi: list[list.length - 1].resi,
    }))
    .sort((a, b) => a.chain.localeCompare(b.chain));
}
