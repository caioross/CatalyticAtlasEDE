import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'About — Catalytic Atlas',
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-12">
      <header className="border-b border-stage-800/70 pb-8">
        <div className="eyebrow">§ About the project</div>
        <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight text-paper-50 text-balance md:text-5xl">
          A browser-native enzymology textbook <span className="italic text-catalytic-gold">that computes.</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-paper-200 text-pretty">
          Catalytic Atlas is an open exploration of enzyme structure, mechanism, kinetics and dynamics
          — curated from the Protein Data Bank, UniProt, M-CSA, BRENDA and the primary literature,
          and extended with real-time coarse-grained physics computed in your browser. No account.
          No tracking. No server for your data to visit.
        </p>
      </header>

      <Section title="Philosophy" number="01">
        <p>
          Modern structural biology is fragmented: beautiful structures on RCSB, mechanisms tucked
          into M-CSA, kinetics hidden in BRENDA, simulations that demand a cluster and a PhD. This
          site tries to collapse the distance — one place where you can look at a classical enzyme,
          step through how it actually catalyses its reaction, read the numbers that define its
          performance, and compute its slow motions without installing anything.
        </p>
        <p>
          The scope is intentionally pedagogical and hypothesis-generating. For production-quality
          molecular dynamics you still want OpenMM, GROMACS, NAMD, or AMBER. For reactive mechanism
          calculations you want CP2K, ORCA, or Gaussian with QM/MM. What lives here is the layer
          above — fast, reproducible, shareable, interactive.
        </p>
      </Section>

      <Section title="What is computed, and how" number="02">
        <p>
          Structure is rendered with <a href="https://molstar.org" target="_blank" rel="noreferrer">Mol*</a>{' '}
          — the same engine RCSB, PDBe and EMDB use for their viewers — with screen-space ambient
          occlusion, a subtle outline pass and antialiasing, streamed directly from the RCSB file
          server. Catalytic residues, mechanism steps and key insights are curated manually from
          M-CSA and the primary literature.
        </p>
        <p>
          Dynamics are computed on demand with an <strong>Anisotropic Network Model</strong>: Cα
          atoms are linked by Hookean springs within a contact cutoff, the Hessian of the harmonic
          potential is diagonalised, and the lowest non-trivial eigenmodes describe the protein&apos;s
          collective slow motions. Cross-correlations, betweenness centrality and a steered-response
          (via the pseudo-inverse) follow from the same eigendecomposition.
        </p>
        <p>
          The mutation sandbox estimates ΔΔG using a <strong>Miyazawa-Jernigan</strong> contact
          potential, with volume-mismatch, charge-flip and class-flip terms scaled by the residue&apos;s
          burial. It is a fast heuristic — not FoldX, not Rosetta — intended to build intuition, not
          to replace a calibrated calculation.
        </p>
        <p>
          Nothing about the workbench is AI. All results are deterministic, reproducible, and
          explainable from the underlying equations. That is the point.
        </p>
      </Section>

      <Section title="Data sources and licences" number="03">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-catalytic-gold">
          <li><a href="https://www.rcsb.org" target="_blank" rel="noreferrer">RCSB PDB</a> — structures, public domain.</li>
          <li><a href="https://www.uniprot.org" target="_blank" rel="noreferrer">UniProt</a> — sequence and functional annotation, CC-BY 4.0.</li>
          <li><a href="https://www.ebi.ac.uk/thornton-srv/m-csa/" target="_blank" rel="noreferrer">M-CSA</a> — curated catalytic mechanisms and residue roles, CC-BY 4.0.</li>
          <li><a href="https://sabiork.h-its.org" target="_blank" rel="noreferrer">SABIO-RK</a> — kinetic parameters, CC-BY.</li>
          <li><a href="https://www.brenda-enzymes.org" target="_blank" rel="noreferrer">BRENDA</a> — referenced for additional data (academic licence).</li>
          <li>Primary literature — cited on each enzyme page and in the mechanism references.</li>
        </ul>
        <p>
          All bundled data is compatible with commercial use. If this project is relicensed or
          integrated into a commercial product, the BRENDA references will be decoupled and the
          integration will rely on CC-BY sources only.
        </p>
      </Section>

      <Section title="Limits of the tool" number="04">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-catalytic-terra">
          <li>The workbench ANM assumes a single conformational state. It cannot describe transitions between distinct conformers or unfolding.</li>
          <li>No explicit solvent. Water networks — crucial for enzymes like carbonic anhydrase — are annotated in the mechanism pages but not simulated.</li>
          <li>No reactive chemistry. The ANM is purely harmonic around the crystal structure; it does not make or break bonds.</li>
          <li>Matrix size limits the method to ~1200 residues. Larger systems need coarse-graining or native MD.</li>
          <li>The ΔΔG estimator is a knowledge-based heuristic, not a thermodynamic calculation. Use it to form hypotheses, not to decide.</li>
        </ul>
      </Section>

      <Section title="Next steps" number="05">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-catalytic-verdigris">
          <li>Expand the catalogue toward 20-50 well-characterised enzymes covering all seven EC classes.</li>
          <li>Pre-computed MD ensembles (mdCATH / BioExcel-CV19) streamed as compressed trajectories.</li>
          <li>On-the-fly pocket detection (Fpocket-style) in the workbench.</li>
          <li>Cryptic-pocket identification from the ANM ensemble.</li>
          <li>QM/MM pre-computed profiles of the catalytic step, as interactive energy diagrams.</li>
        </ul>
      </Section>

      <div className="flex flex-wrap gap-3 pt-4 text-xs">
        <Link href="/" className="btn">Back to catalog</Link>
        <Link href="/workbench" className="btn-primary">
          Open the workbench
          <ArrowRight size={14} />
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="btn-quiet"
        >
          View source <ExternalLink size={12} />
        </a>
      </div>
    </article>
  );
}

function Section({
  title, number, children,
}: { title: string; number: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 md:grid-cols-[84px_1fr]">
      <div className="md:pt-2">
        <div className="tabular font-display text-4xl leading-none text-catalytic-gold">{number}</div>
        <div className="mt-2 h-px w-12 bg-catalytic-gold/60" />
      </div>
      <div className="prose-atlas space-y-4">
        <h2 className="font-display text-2xl tracking-tight text-paper-50 text-balance">{title}</h2>
        {children}
      </div>
    </section>
  );
}
