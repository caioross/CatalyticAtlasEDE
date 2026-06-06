export type CatalyticResidue = {
  chain: string;
  resi: number;
  resn: string;
  role: string;
};

export type MechanismStep = {
  index: number;
  title: string;
  description: string;
  highlightResidues: { chain: string; resi: number }[];
  arrowsFrom?: { chain: string; resi: number; atom?: string }[];
  arrowsTo?: { chain: string; resi: number; atom?: string }[];
  notes?: string;
};

export type KineticEntry = {
  substrate: string;
  kcat_s?: number;
  Km_mM?: number;
  kcat_over_Km_M_s?: number;
  pH?: number;
  temperature_C?: number;
  source: string;
  sourceUrl?: string;
};

export type EnzymeMeta = {
  id: string;
  pdbId: string;
  name: string;
  shortName?: string;
  ecNumber: string;
  organism: string;
  uniprot?: string;
  family: string;
  class: string;
  cofactors: string[];
  substrates: string[];
  products: string[];
  catalyticResidues: CatalyticResidue[];
  chains: string[];
  molecularWeightKDa?: number;
  residuesTotal?: number;
  summary: string;
  keyInsight: string;
  biologicalContext: string;
  pedagogicalNotes: string;
  externalLinks: {
    pdb?: string;
    uniprot?: string;
    mcsa?: string;
    interpro?: string;
    brenda?: string;
    sabioRk?: string;
    reference?: string;
  };
  tags: string[];
};

export type MechanismDoc = {
  enzymeId: string;
  overallReaction: string;
  mechanismType: string;
  rateLimitingStep?: string;
  steps: MechanismStep[];
  references: { citation: string; url?: string }[];
};

export type KineticsDoc = {
  enzymeId: string;
  entries: KineticEntry[];
  notes?: string;
};

export type ENMResult = {
  n: number;
  eigenvalues: number[];
  eigenvectors: number[][];
  modes: {
    index: number;
    eigenvalue: number;
    frequency: number;
    collectivity: number;
    vectors: { x: number; y: number; z: number }[];
  }[];
  crossCorrelation: number[][];
  betweenness: number[];
  residues: { chain: string; resi: number; resn: string; x: number; y: number; z: number }[];
};
