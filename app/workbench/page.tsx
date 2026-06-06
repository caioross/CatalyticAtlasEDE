import ENMAnalysis from '@/components/ENMAnalysis';

export const metadata = {
  title: 'Workbench — Catalytic Atlas',
  description:
    'Upload any PDB and run Anisotropic Network Model analysis in the browser: slow modes, cross-correlations, allosteric betweenness, steered response, dynamic pathways.',
};

export default function WorkbenchPage() {
  return (
    <div className="space-y-10">
      <header className="border-b border-stage-800/70 pb-8">
        <div className="eyebrow">§ Workbench</div>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] tracking-tight text-paper-50 text-balance md:text-5xl">
          Elastic-network analysis of <span className="italic text-catalytic-gold">any</span> structure.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-paper-200 text-pretty">
          Drop in a PDB and the browser builds the Anisotropic Network Model, diagonalises the
          Hessian, and returns the slowest collective modes, a dynamic cross-correlation matrix,
          a steered-response field, and betweenness scores — all client-side, nothing uploaded.
        </p>
      </header>

      <ENMAnalysis />

      <section className="panel p-6">
        <div className="eyebrow">How to read the results</div>
        <div className="mt-4 grid gap-6 text-sm leading-relaxed text-paper-200 md:grid-cols-2">
          <ReadingNote title="Slow modes" accent="gold">
            The lowest non-trivial eigenmodes of the Hessian describe the collective, low-frequency
            motions of the protein — the directions in which the structure is softest. In well-studied
            enzymes these often correspond to functional motions: domain hinging, loop gating, flap
            opening. Mode 1 is typically the largest-amplitude, most collective motion.
          </ReadingNote>
          <ReadingNote title="Collectivity" accent="verdigris">
            A normalised entropy measure (Brüschweiler 1995) of how many residues participate in a mode.
            Values near 1 describe delocalised, global motions (usually the slowest). Values near 0
            describe localised flapping of a small region.
          </ReadingNote>
          <ReadingNote title="Dynamic cross-correlation" accent="terra">
            C<sub>ij</sub> = ⟨Δr<sub>i</sub>·Δr<sub>j</sub>⟩ / √(⟨Δr<sub>i</sub>²⟩⟨Δr<sub>j</sub>²⟩),
            summed over all positive modes. Gold regions are pairs moving together (rigid bodies or
            tightly coupled substructures); terra regions move in opposite directions (hinges).
          </ReadingNote>
          <ReadingNote title="Betweenness centrality" accent="sage">
            Residues with high BC sit on many shortest paths through the dynamically weighted contact
            graph. They are the wiring of the protein — hubs through which mechanical perturbations
            must pass. Cross-reference with the catalytic residues: a residue far from the active site
            with high BC is a candidate allosteric site or cryptic target.
          </ReadingNote>
        </div>
      </section>

      <section className="panel p-6 text-sm leading-relaxed text-paper-200">
        <div className="eyebrow">Method</div>
        <p className="mt-3 text-pretty">
          The implementation follows Atilgan <em>et al.</em> 2001 (Biophys J 80:505) for the ANM
          Hessian construction, Brüschweiler 1995 (J Chem Phys 102:3396) for mode collectivity, and
          Brandes 2001 (J Math Sociol 25:163) for weighted-graph betweenness. The steered response
          uses the pseudo-inverse of the Hessian projected onto non-trivial modes; the dynamic
          pathway is Dijkstra with edge weights 1/(ε + |C<sub>ij</sub>|) over contact neighbours.
          Hessian construction is O(N²), eigendecomposition O(N³).
        </p>
        <p className="mt-3 text-pretty">
          For structures larger than ~1200 residues or systems needing explicit solvent dynamics,
          use a dedicated MD package (OpenMM, GROMACS, NAMD). This workbench is designed for rapid,
          interactive, hypothesis-generating analysis — not production-quality MD.
        </p>
      </section>
    </div>
  );
}

function ReadingNote({
  title, accent, children,
}: {
  title: string;
  accent: 'gold' | 'verdigris' | 'terra' | 'sage';
  children: React.ReactNode;
}) {
  const cls =
    accent === 'gold' ? 'text-catalytic-gold' :
    accent === 'verdigris' ? 'text-catalytic-verdigris' :
    accent === 'terra' ? 'text-catalytic-terra' :
    'text-catalytic-sage';
  return (
    <div>
      <div className={`mb-1.5 font-display text-base ${cls}`}>{title}</div>
      <p className="text-pretty">{children}</p>
    </div>
  );
}
