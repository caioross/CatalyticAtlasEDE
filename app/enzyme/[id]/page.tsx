import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ENZYME_IDS, getEnzyme } from '@/lib/enzymes';
import type { MechanismDoc, KineticsDoc } from '@/lib/types';
import EnzymeDetailView from '@/components/EnzymeDetailView';

export async function generateStaticParams() {
  return ENZYME_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getEnzyme(id);
  if (!e) return { title: 'Not found' };
  const name = e.shortName ?? e.name;
  const title = `${name} (${e.pdbId}) — Structure, Mechanism & Dynamics`;
  return {
    title,
    description: `${e.summary} Explore the 3D structure, catalytic mechanism, kinetics (EC ${e.ecNumber}) and computed dynamics of ${e.name} from ${e.organism}.`,
    keywords: [e.name, e.shortName, e.pdbId, `EC ${e.ecNumber}`, e.organism, e.class, ...e.tags].filter(Boolean) as string[],
    alternates: { canonical: `/enzyme/${id}` },
    openGraph: {
      title: `${name} — Catalytic Atlas`,
      description: e.keyInsight ?? e.summary,
      type: 'article',
      url: `/enzyme/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — Catalytic Atlas`,
      description: e.keyInsight ?? e.summary,
    },
  };
}

async function loadJson<T>(p: string): Promise<T | null> {
  try {
    const text = await fs.promises.readFile(p, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default async function EnzymePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enzyme = getEnzyme(id);
  if (!enzyme) notFound();

  const base = path.join(process.cwd(), 'public', 'enzymes', id);
  const [mechanism, kinetics] = await Promise.all([
    loadJson<MechanismDoc>(path.join(base, 'mechanism.json')),
    loadJson<KineticsDoc>(path.join(base, 'kinetics.json')),
  ]);

  const enzymeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: enzyme.name,
    alternateName: enzyme.shortName,
    description: enzyme.summary,
    inDefinedTermSet: 'https://catalytic-atlas.vercel.app',
    identifier: `EC ${enzyme.ecNumber}`,
    sameAs: [
      `https://www.rcsb.org/structure/${enzyme.pdbId}`,
      enzyme.uniprot ? `https://www.uniprot.org/uniprotkb/${enzyme.uniprot}` : null,
    ].filter(Boolean),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enzymeJsonLd) }}
      />
      <Link
        href="/"
        className="group mb-6 inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-plus text-paper-400 transition hover:text-catalytic-gold"
      >
        <ArrowLeft size={12} className="transition group-hover:-translate-x-0.5" />
        back to catalog
      </Link>
      <EnzymeDetailView enzyme={enzyme} mechanism={mechanism} kinetics={kinetics} />
    </div>
  );
}
