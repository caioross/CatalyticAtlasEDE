import Link from 'next/link';
import { listEnzymes } from '@/lib/enzymes';
import EnzymeCard from '@/components/EnzymeCard';
import { Atom, FlaskConical, Network, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const enzymes = listEnzymes();
  return (
    <div className="space-y-20">
      <section className="relative pt-4">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stage-700/70 bg-stage-900/60 px-3 py-1 font-mono text-2xs uppercase tracking-widest-plus text-paper-300">
            <span className="h-1.5 w-1.5 rounded-full bg-catalytic-gold shadow-[0_0_8px_rgba(232,184,109,0.7)]" />
            Vol. I · An interactive catalogue of biological machines
          </div>

          <h1 className="mt-6 font-display text-5xl leading-[1.05] tracking-tight text-paper-50 text-balance md:text-6xl">
            The quiet machinery of life,{' '}
            <span className="italic text-catalytic-gold">rendered legibly.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper-200 text-pretty">
            Each entry pairs a photo-real three-dimensional structure with its catalytic cycle,
            its kinetic signature, and the vibrational modes that drive allostery. You can rotate,
            mutate, integrate — all in the browser, with the citations kept honest.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#catalog" className="btn-primary">
              Enter the catalog
              <ArrowRight size={14} />
            </Link>
            <Link href="/workbench" className="btn">
              Open the workbench
            </Link>
            <Link href="/about" className="btn-quiet">
              About this project
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-stage-800/70 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            number="01"
            accent="gold"
            icon={<Atom size={16} />}
            title="Mechanism, step by step"
            body="Curated catalytic cycles — key residues, transition states, rate-limiting steps — sourced from M-CSA and primary literature, not hand-waved."
          />
          <FeatureCard
            number="02"
            accent="verdigris"
            icon={<FlaskConical size={16} />}
            title="Kinetics from the record"
            body="kcat, KM, kcat/KM, pH, temperature, and source for every entry, with a live RK4 integrator that lets you inhibit and observe."
          />
          <FeatureCard
            number="03"
            accent="terra"
            icon={<Network size={16} />}
            title="Dynamics computed here"
            body="Upload any PDB and get normal modes, cross-correlations, and a steered elastic-network response in seconds — entirely in your browser."
          />
        </div>
      </section>

      <section id="catalog" className="scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">§ Catalog</div>
            <h2 className="mt-1 font-display text-3xl leading-tight tracking-tight text-paper-50 text-balance">
              Classic enzymes, chosen with care.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper-200 text-pretty">
              Each enzyme in the catalogue earns its place by pedagogical depth, structural clarity,
              and the availability of kinetic and mechanistic data — the ingredients needed to
              understand, not merely depict.
            </p>
          </div>
          <div className="font-mono text-2xs uppercase tracking-widest-plus text-paper-400">
            {enzymes.length} entries · updated quarterly
          </div>
        </div>

        <div className="rule mb-6" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enzymes.map((e) => (
            <EnzymeCard key={e.id} enzyme={e} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  number, accent, icon, title, body,
}: {
  number: string;
  accent: 'gold' | 'verdigris' | 'terra';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const accentText =
    accent === 'gold' ? 'text-catalytic-gold' :
    accent === 'verdigris' ? 'text-catalytic-verdigris' :
    'text-catalytic-terra';
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className={`tabular font-display text-3xl leading-none ${accentText}`}>{number}</span>
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-stage-700/70 bg-stage-900/70 ${accentText}`}>
          {icon}
        </span>
      </div>
      <h3 className="mt-3 font-display text-xl leading-snug text-paper-50">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-paper-200 text-pretty">{body}</p>
    </div>
  );
}
