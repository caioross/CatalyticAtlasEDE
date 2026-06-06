import type { EnzymeMeta } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

type Props = {
  enzyme: EnzymeMeta;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="eyebrow">{label}</div>
      <div className="text-sm text-paper-50">{value}</div>
    </div>
  );
}

export default function MetaCard({ enzyme }: Props) {
  const links = enzyme.externalLinks;
  return (
    <div className="panel p-5">
      <div className="eyebrow">Enzyme identity</div>

      <div className="mt-3 divide-y divide-stage-700/70">
        <Field label="EC number" value={<span className="tabular font-mono">{enzyme.ecNumber}</span>} />
        <Field label="Family" value={enzyme.family} />
        <Field label="Class" value={enzyme.class} />
        <Field label="Organism" value={<span className="italic">{enzyme.organism}</span>} />
        <Field label="PDB" value={<span className="tabular font-mono">{enzyme.pdbId}</span>} />
        {enzyme.uniprot && <Field label="UniProt" value={<span className="tabular font-mono">{enzyme.uniprot}</span>} />}
        {enzyme.cofactors.length > 0 && <Field label="Cofactors" value={enzyme.cofactors.join(', ')} />}
        <Field
          label="Substrate(s)"
          value={
            <ul className="list-disc space-y-0.5 pl-4">
              {enzyme.substrates.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          }
        />
        <Field
          label="Product(s)"
          value={
            <ul className="list-disc space-y-0.5 pl-4">
              {enzyme.products.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          }
        />
        <Field
          label="Mass / length"
          value={<span className="tabular font-mono">{enzyme.molecularWeightKDa ?? '—'} kDa · {enzyme.residuesTotal ?? '—'} residues</span>}
        />
      </div>

      <div className="mt-5 border-t border-stage-700/60 pt-4">
        <div className="eyebrow">External databases</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {links.pdb && <LinkChip href={links.pdb} label="RCSB PDB" />}
          {links.uniprot && <LinkChip href={links.uniprot} label="UniProt" />}
          {links.mcsa && <LinkChip href={links.mcsa} label="M-CSA" />}
          {links.interpro && <LinkChip href={links.interpro} label="InterPro" />}
          {links.brenda && <LinkChip href={links.brenda} label="BRENDA" />}
          {links.sabioRk && <LinkChip href={links.sabioRk} label="SABIO-RK" />}
          {links.reference && <LinkChip href={links.reference} label="Primary reference" />}
        </div>
      </div>
    </div>
  );
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border border-stage-700 bg-stage-850/60 px-2 py-1 text-paper-200 transition hover:border-catalytic-gold/50 hover:text-catalytic-gold"
    >
      {label}
      <ExternalLink size={10} />
    </a>
  );
}
