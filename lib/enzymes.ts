import type { EnzymeMeta } from './types';

export const ENZYME_IDS = [
  'lysozyme-1aki',
  'tim-1ypi',
  'chymotrypsin-4cha',
  'carbonic-anhydrase-3ks3',
  'hiv-protease-1hvr',
  'sars2-mpro-6lu7',
] as const;

export type EnzymeId = (typeof ENZYME_IDS)[number];

export const ENZYMES: Record<EnzymeId, EnzymeMeta> = {
  'lysozyme-1aki': {
    id: 'lysozyme-1aki',
    pdbId: '1AKI',
    name: 'Hen egg-white lysozyme',
    shortName: 'Lysozyme',
    ecNumber: 'EC 3.2.1.17',
    organism: 'Gallus gallus',
    uniprot: 'P00698',
    family: 'Glycoside hydrolase family 22',
    class: 'Hydrolase / glycosidase',
    cofactors: [],
    substrates: ['Peptidoglycan (β-1,4 linkage between NAM and NAG)'],
    products: ['Cleaved peptidoglycan fragments'],
    catalyticResidues: [
      { chain: 'A', resi: 35, resn: 'GLU', role: 'General acid (protonates leaving group)' },
      { chain: 'A', resi: 52, resn: 'ASP', role: 'Stabilises oxocarbenium / general base' },
    ],
    chains: ['A'],
    molecularWeightKDa: 14.3,
    residuesTotal: 129,
    summary:
      'The archetype of mechanistic enzymology. Cleaves β-1,4 glycosidic bonds in bacterial peptidoglycan through an oxocarbenium-ion intermediate.',
    keyInsight:
      'Koshland refined the mechanism in 1953 using lysozyme — the classic retaining glycosidase textbook case. Glu35 acts as the general acid and Asp52 stabilises the covalent glycosyl-enzyme intermediate.',
    biologicalContext:
      'First enzyme to have its 3D structure solved (Phillips, 1965). Present in tears, saliva, egg white — part of innate immunity against Gram-positive bacteria.',
    pedagogicalNotes:
      'Ideal for teaching: small, monomeric, well-understood mechanism, abundant kinetic data, thousands of PDB entries for mutants.',
    externalLinks: {
      pdb: 'https://www.rcsb.org/structure/1AKI',
      uniprot: 'https://www.uniprot.org/uniprotkb/P00698',
      mcsa: 'https://www.ebi.ac.uk/thornton-srv/m-csa/entry/2/',
      interpro: 'https://www.ebi.ac.uk/interpro/protein/UniProt/P00698/',
      brenda: 'https://www.brenda-enzymes.org/enzyme.php?ecno=3.2.1.17',
      reference: 'https://doi.org/10.1038/206757a0',
    },
    tags: ['glycoside hydrolase', 'oxocarbenium', 'retaining', 'monomeric', 'classic'],
  },
  'tim-1ypi': {
    id: 'tim-1ypi',
    pdbId: '1YPI',
    name: 'Triosephosphate isomerase',
    shortName: 'TIM',
    ecNumber: 'EC 5.3.1.1',
    organism: 'Saccharomyces cerevisiae',
    uniprot: 'P00942',
    family: 'Triosephosphate isomerase family',
    class: 'Isomerase',
    cofactors: [],
    substrates: ['D-glyceraldehyde-3-phosphate (GAP)', 'Dihydroxyacetone phosphate (DHAP)'],
    products: ['Dihydroxyacetone phosphate (DHAP)', 'D-glyceraldehyde-3-phosphate (GAP)'],
    catalyticResidues: [
      { chain: 'A', resi: 165, resn: 'GLU', role: 'General base / acid — proton shuttle' },
      { chain: 'A', resi: 95, resn: 'HIS', role: 'Electrophile — polarises C1/C2 carbonyl' },
      { chain: 'A', resi: 13, resn: 'LYS', role: 'Positive charge stabilises enediolate' },
    ],
    chains: ['A', 'B'],
    molecularWeightKDa: 26.7,
    residuesTotal: 247,
    summary:
      'A catalytically perfect enzyme — its reaction is limited only by diffusion. Interconverts GAP and DHAP via a cis-enediol(ate) intermediate.',
    keyInsight:
      'TIM is the textbook example of a diffusion-limited enzyme (kcat/KM ≈ 10^8 M⁻¹s⁻¹). The active site is gated by a flexible Ω-loop (residues 166–176) whose closure is essential for catalysis and prevents methylglyoxal leakage.',
    biologicalContext:
      'Central to glycolysis and gluconeogenesis. Defines the TIM-barrel (β/α)₈ fold — the most common fold in nature.',
    pedagogicalNotes:
      'Showcase for: loop dynamics, electrostatic catalysis, enzyme perfection, the classic β/α barrel architecture.',
    externalLinks: {
      pdb: 'https://www.rcsb.org/structure/1YPI',
      uniprot: 'https://www.uniprot.org/uniprotkb/P00942',
      mcsa: 'https://www.ebi.ac.uk/thornton-srv/m-csa/entry/8/',
      interpro: 'https://www.ebi.ac.uk/interpro/protein/UniProt/P00942/',
      brenda: 'https://www.brenda-enzymes.org/enzyme.php?ecno=5.3.1.1',
      reference: 'https://doi.org/10.1038/255609a0',
    },
    tags: ['isomerase', 'TIM barrel', 'loop dynamics', 'diffusion-limited', 'glycolysis'],
  },
  'chymotrypsin-4cha': {
    id: 'chymotrypsin-4cha',
    pdbId: '4CHA',
    name: 'α-Chymotrypsin',
    shortName: 'Chymotrypsin',
    ecNumber: 'EC 3.4.21.1',
    organism: 'Bos taurus',
    uniprot: 'P00766',
    family: 'Peptidase S1 (chymotrypsin family)',
    class: 'Hydrolase / serine protease',
    cofactors: [],
    substrates: ['Peptide bonds C-terminal to Phe, Tyr, Trp'],
    products: ['Cleaved peptides'],
    catalyticResidues: [
      { chain: 'A', resi: 195, resn: 'SER', role: 'Nucleophile — attacks carbonyl carbon' },
      { chain: 'A', resi: 57, resn: 'HIS', role: 'General base — activates Ser195' },
      { chain: 'A', resi: 102, resn: 'ASP', role: 'Orients and stabilises His57+ via hydrogen bond' },
    ],
    chains: ['A', 'B', 'C'],
    molecularWeightKDa: 25.0,
    residuesTotal: 241,
    summary:
      'The paradigm of the catalytic triad (Ser-His-Asp). Two-step mechanism: acylation forms a covalent acyl-enzyme intermediate; deacylation by water releases the C-terminal product.',
    keyInsight:
      'The oxyanion hole (backbone amides of Gly193 and Ser195) stabilises the tetrahedral transition state by 5–8 kcal/mol — a textbook example of transition-state stabilisation.',
    biologicalContext:
      'Secreted by the pancreas as the zymogen chymotrypsinogen; activated by trypsin. Central to protein digestion. Prototype of the S1 peptidase clan — shared architecture with trypsin, elastase, thrombin.',
    pedagogicalNotes:
      'Gold standard for teaching covalent catalysis, charge-relay, oxyanion hole, serine protease family evolution.',
    externalLinks: {
      pdb: 'https://www.rcsb.org/structure/4CHA',
      uniprot: 'https://www.uniprot.org/uniprotkb/P00766',
      mcsa: 'https://www.ebi.ac.uk/thornton-srv/m-csa/entry/39/',
      interpro: 'https://www.ebi.ac.uk/interpro/protein/UniProt/P00766/',
      brenda: 'https://www.brenda-enzymes.org/enzyme.php?ecno=3.4.21.1',
      reference: 'https://doi.org/10.1146/annurev.bi.46.070177.002555',
    },
    tags: ['serine protease', 'catalytic triad', 'covalent', 'acyl-enzyme', 'oxyanion hole'],
  },
  'carbonic-anhydrase-3ks3': {
    id: 'carbonic-anhydrase-3ks3',
    pdbId: '3KS3',
    name: 'Human carbonic anhydrase II',
    shortName: 'CA II',
    ecNumber: 'EC 4.2.1.1',
    organism: 'Homo sapiens',
    uniprot: 'P00918',
    family: 'Carbonic anhydrase α-class',
    class: 'Lyase / metalloenzyme',
    cofactors: ['Zn²⁺ (catalytic, tetrahedral)'],
    substrates: ['CO₂ + H₂O'],
    products: ['HCO₃⁻ + H⁺'],
    catalyticResidues: [
      { chain: 'A', resi: 94, resn: 'HIS', role: 'Zn²⁺ ligand' },
      { chain: 'A', resi: 96, resn: 'HIS', role: 'Zn²⁺ ligand' },
      { chain: 'A', resi: 119, resn: 'HIS', role: 'Zn²⁺ ligand' },
      { chain: 'A', resi: 199, resn: 'THR', role: 'Orients zinc-hydroxide for attack on CO₂' },
      { chain: 'A', resi: 106, resn: 'GLU', role: 'Polarises Thr199 hydroxyl' },
      { chain: 'A', resi: 64, resn: 'HIS', role: 'Proton shuttle to bulk solvent' },
    ],
    chains: ['A'],
    molecularWeightKDa: 29.1,
    residuesTotal: 260,
    summary:
      'One of the fastest enzymes known (kcat ≈ 10⁶ s⁻¹). Catalyses the reversible hydration of CO₂ to bicarbonate via a zinc-hydroxide mechanism.',
    keyInsight:
      'Rate is limited by proton transfer from the zinc-bound water to bulk solvent, shuttled by His64 via a network of ordered water molecules (the "proton wire"). Water network dynamics IS the rate-limiting step — hard to appreciate without explicit solvent simulation.',
    biologicalContext:
      'Essential for CO₂ transport in blood, pH homeostasis, acid secretion in stomach, aqueous humour production in eye. Target of diuretics and glaucoma drugs (acetazolamide, dorzolamide).',
    pedagogicalNotes:
      'Best example of: metalloenzyme catalysis, proton-transfer networks, drug target enzyme, near-maximum catalytic efficiency.',
    externalLinks: {
      pdb: 'https://www.rcsb.org/structure/3KS3',
      uniprot: 'https://www.uniprot.org/uniprotkb/P00918',
      mcsa: 'https://www.ebi.ac.uk/thornton-srv/m-csa/entry/10/',
      interpro: 'https://www.ebi.ac.uk/interpro/protein/UniProt/P00918/',
      brenda: 'https://www.brenda-enzymes.org/enzyme.php?ecno=4.2.1.1',
      reference: 'https://doi.org/10.1146/annurev.bi.64.070195.002113',
    },
    tags: ['metalloenzyme', 'zinc', 'lyase', 'proton wire', 'drug target', 'fastest'],
  },
  'hiv-protease-1hvr': {
    id: 'hiv-protease-1hvr',
    pdbId: '1HVR',
    name: 'HIV-1 protease',
    shortName: 'HIV-1 PR',
    ecNumber: 'EC 3.4.23.16',
    organism: 'Human immunodeficiency virus type 1',
    uniprot: 'P04585',
    family: 'Peptidase A2 (retroviral aspartyl protease)',
    class: 'Hydrolase / aspartyl protease',
    cofactors: [],
    substrates: ['Viral Gag and Gag-Pol polyprotein cleavage sites'],
    products: ['Mature viral structural and enzymatic proteins'],
    catalyticResidues: [
      { chain: 'A', resi: 25, resn: 'ASP', role: 'Catalytic dyad (chain A) — activates water' },
      { chain: 'B', resi: 25, resn: 'ASP', role: 'Catalytic dyad (chain B) — protonates amide leaving group' },
    ],
    chains: ['A', 'B'],
    molecularWeightKDa: 21.6,
    residuesTotal: 198,
    summary:
      'Obligate homodimer where each subunit contributes one Asp25 to a shared catalytic dyad. Hydrolyses viral polyproteins into functional proteins — essential for HIV maturation.',
    keyInsight:
      'The flexible β-hairpin "flaps" (residues 43–58 on each chain) gate access to the active site. Flap opening/closing is the slow conformational step and the target of all clinical protease inhibitors, which trap the closed conformation.',
    biologicalContext:
      'First major success of structure-based drug design. Saquinavir (1995) was the first HIV PR inhibitor approved; darunavir (2006) is the modern standard. The target remains under continuous evolutionary pressure — resistance mutations are a moving target.',
    pedagogicalNotes:
      'Demonstrates: homodimer symmetry, allosteric flap dynamics, structure-based drug discovery, resistance evolution. Extremely well-characterised — thousands of PDB entries with inhibitors.',
    externalLinks: {
      pdb: 'https://www.rcsb.org/structure/1HVR',
      uniprot: 'https://www.uniprot.org/uniprotkb/P04585',
      mcsa: 'https://www.ebi.ac.uk/thornton-srv/m-csa/entry/37/',
      interpro: 'https://www.ebi.ac.uk/interpro/protein/UniProt/P04585/',
      brenda: 'https://www.brenda-enzymes.org/enzyme.php?ecno=3.4.23.16',
      reference: 'https://doi.org/10.1126/science.2548279',
    },
    tags: ['aspartyl protease', 'homodimer', 'drug target', 'HIV', 'flap dynamics'],
  },
  'sars2-mpro-6lu7': {
    id: 'sars2-mpro-6lu7',
    pdbId: '6LU7',
    name: 'SARS-CoV-2 main protease (Mpro / 3CLpro)',
    shortName: 'Mpro',
    ecNumber: 'EC 3.4.22.69',
    organism: 'SARS-CoV-2',
    uniprot: 'P0DTD1',
    family: 'Peptidase C30 (coronavirus main protease)',
    class: 'Hydrolase / cysteine protease',
    cofactors: [],
    substrates: ['Coronaviral polyproteins pp1a and pp1ab at 11 conserved sites'],
    products: ['16 non-structural proteins (nsp1–nsp16)'],
    catalyticResidues: [
      { chain: 'A', resi: 145, resn: 'CYS', role: 'Nucleophile (thiolate attacks substrate carbonyl)' },
      { chain: 'A', resi: 41, resn: 'HIS', role: 'General base — activates Cys145' },
    ],
    chains: ['A'],
    molecularWeightKDa: 33.8,
    residuesTotal: 306,
    summary:
      'Cysteine-histidine catalytic dyad. Cleaves the coronaviral polyprotein at 11 conserved Leu-Gln↓(Ser/Ala/Gly) sites — essential for viral replication.',
    keyInsight:
      'Mpro is functional only as a homodimer; the N-terminal finger of one protomer organises the oxyanion hole and S1 pocket of the other. The dimer interface is itself a potential drug target ("allosteric inhibition by dimer disruption").',
    biologicalContext:
      'Validated COVID-19 drug target. Nirmatrelvir (the active ingredient of Paxlovid, approved 2021) is a peptidomimetic covalent inhibitor that mimics the tetrahedral transition state.',
    pedagogicalNotes:
      'Contemporary example of: cysteine protease mechanism, rapid structure-based drug discovery under pandemic conditions, covalent inhibitor design, pan-coronavirus scaffolds.',
    externalLinks: {
      pdb: 'https://www.rcsb.org/structure/6LU7',
      uniprot: 'https://www.uniprot.org/uniprotkb/P0DTD1',
      mcsa: 'https://www.ebi.ac.uk/thornton-srv/m-csa/entry/904/',
      interpro: 'https://www.ebi.ac.uk/interpro/entry/InterPro/IPR008740/',
      brenda: 'https://www.brenda-enzymes.org/enzyme.php?ecno=3.4.22.69',
      reference: 'https://doi.org/10.1038/s41586-020-2223-y',
    },
    tags: ['cysteine protease', 'coronavirus', 'drug target', 'covalent inhibitor', 'SARS-CoV-2'],
  },
};

export function getEnzyme(id: string): EnzymeMeta | undefined {
  return ENZYMES[id as EnzymeId];
}

export function listEnzymes(): EnzymeMeta[] {
  return ENZYME_IDS.map((id) => ENZYMES[id]);
}
