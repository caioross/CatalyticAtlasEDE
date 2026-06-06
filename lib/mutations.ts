/**
 * Knowledge-based mutation impact estimator.
 *
 * Produces a ΔΔG estimate in kcal/mol from:
 *   (1) Miyazawa–Jernigan contact-energy change over the local Cα neighborhood
 *   (2) a side-chain volume mismatch penalty (steric clash for bulky → cavity for small)
 *   (3) a class-flip / charge-flip penalty that captures polarity reversals
 *
 * This is an *approximation* meant to give an intuitive, directionally-correct
 * first-pass estimate in the browser. It is NOT a replacement for FoldX, Rosetta,
 * or Alanine-scanning on MD ensembles. We surface all three components in the
 * UI so the user can see *why* a mutation is disruptive, not just a scalar.
 */

import type { CAAtom } from './pdb';
import { AMINO_ACIDS, AA_ORDER, aaThreeToInfo, aaOneToInfo, mjContact } from './residues';

export type MutationResult = {
  target: { chain: string; resi: number; fromThree: string; toThree: string; fromOne: string; toOne: string };
  contacts: {
    chain: string;
    resi: number;
    resn: string;
    distance: number;
    deltaE: number;
  }[];
  deltaMJ: number;
  deltaVolume: number;
  deltaCharge: number;
  classFlip: boolean;
  chargeFlip: boolean;
  deltaG: number;
  severity: 'neutral' | 'mild' | 'moderate' | 'severe';
  rationale: string;
};

/**
 * Per-component weights tuned so that a reasonable loss-of-function mutation
 * (e.g. buried hydrophobic → charged) lands in the +3 to +8 kcal/mol range,
 * matching the order of magnitude seen in ProTherm / Guerois-style datasets.
 */
const WEIGHTS = {
  mj: 0.8,          // MJ ΔE already in kcal/mol, kept near unity
  volumeKcalPerA3: 0.015, // penalise ~0.015 kcal/mol per Å^3 of mismatch
  chargeFlip: 1.8,
  classFlip: 0.6,
  burialBonus: 1.5, // if fully buried (many contacts), everything hurts more
};

export function estimateMutation(
  atoms: CAAtom[],
  chain: string,
  resi: number,
  toOne: string,
  cutoff = 8.5,
): MutationResult | null {
  const iTarget = atoms.findIndex((a) => a.chain === chain && a.resi === resi);
  if (iTarget < 0) return null;

  const from = aaThreeToInfo(atoms[iTarget].resn);
  const to = aaOneToInfo(toOne);
  if (!from || !to) return null;
  if (!AA_ORDER.includes(from.one) || !AA_ORDER.includes(to.one)) return null;

  const tgt = atoms[iTarget];
  const contacts: MutationResult['contacts'] = [];
  let deltaMJ = 0;

  for (let j = 0; j < atoms.length; j++) {
    if (j === iTarget) continue;
    const a = atoms[j];
    const dx = a.x - tgt.x;
    const dy = a.y - tgt.y;
    const dz = a.z - tgt.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > cutoff) continue;

    const partner = AMINO_ACIDS[a.resn.toUpperCase()];
    if (!partner) continue;

    const eNew = mjContact(to.one, partner.one);
    const eOld = mjContact(from.one, partner.one);
    const dE = eNew - eOld;
    deltaMJ += dE;
    contacts.push({ chain: a.chain, resi: a.resi, resn: a.resn, distance: d, deltaE: dE });
  }

  const buried = contacts.length >= 18 ? 1 : contacts.length >= 10 ? 0.6 : 0.2;

  const deltaVolume = to.volume - from.volume;
  const deltaCharge = to.chargeAtPh7 - from.chargeAtPh7;
  const classFlip = from.class !== to.class;
  const chargeFlip = (from.chargeAtPh7 === 0) !== (to.chargeAtPh7 === 0) || Math.sign(from.chargeAtPh7) !== Math.sign(to.chargeAtPh7);

  const volumePenalty = Math.abs(deltaVolume) * WEIGHTS.volumeKcalPerA3 * (1 + buried * WEIGHTS.burialBonus);
  const chargeFlipTerm = chargeFlip ? WEIGHTS.chargeFlip * (1 + buried * WEIGHTS.burialBonus) : 0;
  const classFlipTerm = !chargeFlip && classFlip ? WEIGHTS.classFlip : 0;

  const deltaG = WEIGHTS.mj * deltaMJ + volumePenalty + chargeFlipTerm + classFlipTerm;

  const abs = Math.abs(deltaG);
  const severity: MutationResult['severity'] =
    abs < 0.5 ? 'neutral' : abs < 2 ? 'mild' : abs < 5 ? 'moderate' : 'severe';

  const reasons: string[] = [];
  if (Math.abs(deltaMJ) > 0.5) {
    reasons.push(
      deltaMJ > 0
        ? `loses ${deltaMJ.toFixed(2)} kcal/mol of favorable contact energy across ${contacts.length} neighbors`
        : `gains ${Math.abs(deltaMJ).toFixed(2)} kcal/mol in contact energy (unusual stabilization)`,
    );
  }
  if (Math.abs(deltaVolume) > 25) {
    reasons.push(
      deltaVolume > 0
        ? `sidechain volume grows by ${deltaVolume.toFixed(0)} Å³ — steric pressure on the local pocket`
        : `sidechain volume shrinks by ${Math.abs(deltaVolume).toFixed(0)} Å³ — risk of a cavity`,
    );
  }
  if (chargeFlip) {
    reasons.push(`charge at pH 7 changes (${from.chargeAtPh7 > 0 ? '+' : from.chargeAtPh7}) → (${to.chargeAtPh7 > 0 ? '+' + to.chargeAtPh7 : to.chargeAtPh7})`);
  } else if (classFlip) {
    reasons.push(`chemical class flips from ${from.class} to ${to.class}`);
  }
  if (buried >= 1) reasons.push('residue is deeply buried, so any change is amplified');

  const rationale = reasons.length ? reasons.join('; ') : 'conservative substitution — little local disturbance expected';

  return {
    target: {
      chain,
      resi,
      fromThree: from.three,
      toThree: to.three,
      fromOne: from.one,
      toOne: to.one,
    },
    contacts,
    deltaMJ,
    deltaVolume,
    deltaCharge,
    classFlip,
    chargeFlip,
    deltaG,
    severity,
    rationale,
  };
}
