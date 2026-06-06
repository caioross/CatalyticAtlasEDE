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
  return {
    title: `${e.shortName ?? e.name} — Catalytic Atlas`,
    description: e.summary,
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

  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest text-ink-400 hover:text-accent-cyan"
      >
        <ArrowLeft size={12} />
        back to catalog
      </Link>
      <EnzymeDetailView enzyme={enzyme} mechanism={mechanism} kinetics={kinetics} />
    </div>
  );
}
