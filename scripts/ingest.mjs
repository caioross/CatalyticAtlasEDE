#!/usr/bin/env node
// Catalytic Atlas — enzyme ingestion script.
// Usage: node scripts/ingest.mjs <pdb-id> [--slug my-enzyme] [--ec 3.2.1.17]
//
// Fetches public metadata from RCSB PDB, UniProt and the M-CSA and emits
// a draft directory under public/enzymes/<slug>/ with meta.json,
// mechanism.json and kinetics.json templates ready for manual curation.
//
// All sources used here are CC-BY-compatible and safe for commercial use.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`\nCatalytic Atlas ingestion\n\nUsage: node scripts/ingest.mjs <pdb-id> [--slug my-enzyme] [--ec 3.2.1.17]\n\nExample: node scripts/ingest.mjs 1RX2 --slug dhfr-1rx2\n`);
  process.exit(0);
}

const pdbId = args[0].toUpperCase();
const slug = (() => {
  const idx = args.indexOf('--slug');
  return idx >= 0 ? args[idx + 1] : pdbId.toLowerCase();
})();
const ecFromCli = (() => {
  const idx = args.indexOf('--ec');
  return idx >= 0 ? args[idx + 1] : null;
})();

const OUT_DIR = path.join(process.cwd(), 'public', 'enzymes', slug);

async function main() {
  console.log(`\n=== Ingesting ${pdbId} → ${slug} ===\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });

  const rcsb = await fetchRcsb(pdbId);
  const uniprotId = rcsb.uniprotId;
  const uniprot = uniprotId ? await fetchUniprot(uniprotId) : null;
  const ec = ecFromCli ?? rcsb.ec ?? uniprot?.ec ?? null;
  const mcsa = ec ? await fetchMcsa(ec, uniprotId) : null;

  const meta = buildMeta({ pdbId, slug, rcsb, uniprot, ec, mcsa });
  const mechanism = buildMechanismTemplate({ slug, ec, mcsa });
  const kinetics = buildKineticsTemplate({ slug });

  await writeJson(path.join(OUT_DIR, 'meta.json'), meta);
  await writeJson(path.join(OUT_DIR, 'mechanism.json'), mechanism);
  await writeJson(path.join(OUT_DIR, 'kinetics.json'), kinetics);

  console.log(`\n✅ Wrote drafts to ${OUT_DIR}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Register "${slug}" in lib/enzymes.ts.`);
  console.log(`  2. Curate mechanism.json steps using M-CSA (${mcsa?.url ?? 'not found'}) and primary literature.`);
  console.log(`  3. Curate kinetics.json entries from SABIO-RK / BRENDA / primary references.`);
  console.log(`  4. Run: npm run dev`);
}

async function fetchRcsb(pdbId) {
  console.log(`→ RCSB metadata for ${pdbId}`);
  const entry = await fetchJson(`https://data.rcsb.org/rest/v1/core/entry/${pdbId}`);
  const polymers = await fetchJson(`https://data.rcsb.org/rest/v1/core/polymer_entity/${pdbId}/1`).catch(() => null);

  const title = entry?.struct?.title ?? '';
  const organism = polymers?.rcsb_entity_source_organism?.[0]?.scientific_name ?? '';
  const uniprotId = polymers?.rcsb_polymer_entity_container_identifiers?.reference_sequence_identifiers
    ?.find((r) => r.database_name === 'UniProt')?.database_accession ?? null;
  const ec = polymers?.rcsb_polymer_entity?.rcsb_ec_lineage?.[0]?.id
    ?? polymers?.rcsb_polymer_entity?.pdbx_ec ?? null;

  const lengths = entry?.rcsb_entry_info?.deposited_polymer_monomer_count ?? null;
  const chains = polymers?.entity_poly?.pdbx_strand_id?.split(',').map((c) => c.trim()) ?? [];
  const mass = polymers?.rcsb_polymer_entity?.formula_weight ?? null;

  console.log(`  title: ${title.slice(0, 80)}`);
  console.log(`  organism: ${organism || '—'}`);
  console.log(`  uniprot: ${uniprotId ?? '—'}  ec: ${ec ?? '—'}  chains: ${chains.join(',') || '—'}`);

  return { title, organism, uniprotId, ec, chains, residuesTotal: lengths, massDa: mass };
}

async function fetchUniprot(id) {
  console.log(`→ UniProt ${id}`);
  const data = await fetchJson(`https://rest.uniprot.org/uniprotkb/${id}.json`).catch(() => null);
  if (!data) return null;
  const protein = data.proteinDescription?.recommendedName?.fullName?.value ?? '';
  const ec = data.proteinDescription?.recommendedName?.ecNumbers?.[0]?.value ?? null;
  const organism = data.organism?.scientificName ?? '';
  const cofactors = (data.comments ?? [])
    .filter((c) => c.commentType === 'COFACTOR')
    .flatMap((c) => (c.cofactors ?? []).map((k) => k.name));
  const family = data.proteinDescription?.recommendedName?.shortNames?.[0]?.value ?? '';
  const function_ = (data.comments ?? []).find((c) => c.commentType === 'FUNCTION')?.texts?.[0]?.value ?? '';
  console.log(`  protein: ${protein}`);
  console.log(`  ec: ${ec ?? '—'}  cofactors: ${cofactors.join(', ') || '—'}`);
  return { protein, ec, organism, cofactors, family, function: function_ };
}

async function fetchMcsa(ec, uniprotId) {
  console.log(`→ M-CSA search (EC ${ec}${uniprotId ? `, UniProt ${uniprotId}` : ''})`);
  const url = `https://www.ebi.ac.uk/thornton-srv/m-csa/api/entries/?format=json&ec_number=${encodeURIComponent(ec)}`;
  const data = await fetchJson(url).catch(() => null);
  if (!data?.results?.length) {
    console.log(`  no M-CSA entries matched.`);
    return null;
  }
  const pick =
    data.results.find((e) => (e.proteins ?? []).some((p) => p.uniprot_id === uniprotId)) ??
    data.results[0];
  const entryUrl = `https://www.ebi.ac.uk/thornton-srv/m-csa/entry/${pick.mcsa_id}/`;
  console.log(`  match: M-CSA ${pick.mcsa_id} — ${pick.name}`);
  console.log(`  ${entryUrl}`);
  return { id: pick.mcsa_id, name: pick.name, url: entryUrl, raw: pick };
}

function buildMeta({ pdbId, slug, rcsb, uniprot, ec, mcsa }) {
  return {
    id: slug,
    pdbId,
    name: uniprot?.protein ?? rcsb.title,
    shortName: '',
    ecNumber: ec ? `EC ${ec}` : '',
    organism: rcsb.organism || uniprot?.organism || '',
    uniprot: rcsb.uniprotId ?? '',
    family: uniprot?.family ?? '',
    class: '',
    cofactors: uniprot?.cofactors ?? [],
    substrates: [],
    products: [],
    catalyticResidues: [],
    chains: rcsb.chains,
    molecularWeightKDa: rcsb.massDa ? Number((rcsb.massDa / 1000).toFixed(1)) : undefined,
    residuesTotal: rcsb.residuesTotal ?? undefined,
    summary: '',
    keyInsight: '',
    biologicalContext: uniprot?.function ?? '',
    pedagogicalNotes: '',
    externalLinks: {
      pdb: `https://www.rcsb.org/structure/${pdbId}`,
      uniprot: rcsb.uniprotId ? `https://www.uniprot.org/uniprotkb/${rcsb.uniprotId}` : undefined,
      mcsa: mcsa?.url,
      interpro: rcsb.uniprotId ? `https://www.ebi.ac.uk/interpro/protein/UniProt/${rcsb.uniprotId}/` : undefined,
      brenda: ec ? `https://www.brenda-enzymes.org/enzyme.php?ecno=${ec}` : undefined,
    },
    tags: [],
  };
}

function buildMechanismTemplate({ slug, ec, mcsa }) {
  const reaction = mcsa?.raw?.reaction?.name ?? '';
  const mechType = mcsa?.raw?.type ?? '';
  return {
    enzymeId: slug,
    overallReaction: reaction,
    mechanismType: mechType,
    rateLimitingStep: '',
    steps: [
      {
        index: 1,
        title: 'Curate this step',
        description: 'Replace with the first mechanistic step from M-CSA / primary literature.',
        highlightResidues: [],
      },
    ],
    references: mcsa
      ? [{ citation: `M-CSA entry ${mcsa.id}`, url: mcsa.url }]
      : [],
  };
}

function buildKineticsTemplate({ slug }) {
  return {
    enzymeId: slug,
    entries: [
      {
        substrate: 'replace with real substrate',
        kcat_s: undefined,
        Km_mM: undefined,
        kcat_over_Km_M_s: undefined,
        pH: undefined,
        temperature_C: undefined,
        source: 'Primary reference / SABIO-RK',
        sourceUrl: '',
      },
    ],
    notes: '',
  };
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'catalytic-atlas-ingest/0.1' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} — ${url}`);
  return r.json();
}

async function writeJson(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`  wrote ${path.relative(process.cwd(), p)}`);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
