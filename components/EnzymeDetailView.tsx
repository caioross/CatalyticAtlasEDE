'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MolstarViewer, { type MolstarViewerHandle, type ResidueSelection, type ViewerRepresentation, type ViewerColor } from './viewer/MolstarViewer';
import ViewerControls from './viewer/ViewerControls';
import ResidueInspector from './viewer/ResidueInspector';
import MutationTool from './viewer/MutationTool';
import MechanismStepper from './MechanismStepper';
import KineticsPanel from './KineticsPanel';
import KineticSimulator from './KineticSimulator';
import MetaCard from './MetaCard';
import type { EnzymeMeta, KineticsDoc, MechanismDoc, MechanismStep, CatalyticResidue } from '@/lib/types';
import type { CAAtom } from '@/lib/pdb';
import { parsePdbCA, fetchPdbText } from '@/lib/pdb';

type Props = {
  enzyme: EnzymeMeta;
  mechanism: MechanismDoc | null;
  kinetics: KineticsDoc | null;
};

export default function EnzymeDetailView({ enzyme, mechanism, kinetics }: Props) {
  const viewerRef = useRef<MolstarViewerHandle>(null);
  const [atoms, setAtoms] = useState<CAAtom[] | null>(null);
  const [stepHighlight, setStepHighlight] = useState<MechanismStep | null>(null);
  const [representation, setRepresentation] = useState<ViewerRepresentation>('cartoon+surface');
  const [color, setColor] = useState<ViewerColor>('chain-id');
  const [spinning, setSpinning] = useState(false);
  const [selection, setSelection] = useState<ResidueSelection | null>(null);
  const [mutationOpen, setMutationOpen] = useState(false);

  // Load Cα atoms in parallel for mutation tool & analyses
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await fetchPdbText(enzyme.pdbId);
        const parsed = parsePdbCA(text);
        if (!cancelled) setAtoms(parsed);
      } catch {
        /* silent — mutation tool simply disables */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enzyme.pdbId]);

  // Apply mechanism-step highlights on top of the catalytic residues
  useEffect(() => {
    if (!viewerRef.current) return;
    if (stepHighlight && stepHighlight.highlightResidues.length > 0) {
      const selection: ResidueSelection[] = stepHighlight.highlightResidues.map((r) => {
        const cat = enzyme.catalyticResidues.find((c) => c.chain === r.chain && c.resi === r.resi);
        return { chain: r.chain, resi: r.resi, resn: cat?.resn };
      });
      viewerRef.current.highlightResidues(selection);
      if (selection[0]) viewerRef.current.focusResidue(selection[0].chain, selection[0].resi);
    } else {
      viewerRef.current.highlightResidues(enzyme.catalyticResidues);
    }
  }, [stepHighlight, enzyme.catalyticResidues]);

  const handleResidueClick = useCallback((s: ResidueSelection | null) => {
    if (s) setSelection(s);
  }, []);

  const handleRepChange = (r: ViewerRepresentation) => {
    setRepresentation(r);
    viewerRef.current?.setRepresentation(r);
  };
  const handleColorChange = (c: ViewerColor) => {
    setColor(c);
    viewerRef.current?.setColor(c);
  };
  const handleToggleSpin = () => {
    setSpinning((s) => !s);
    viewerRef.current?.toggleSpin();
  };
  const handleScreenshot = async () => {
    const uri = await viewerRef.current?.screenshot();
    if (!uri) return;
    const a = document.createElement('a');
    a.href = uri;
    a.download = `${enzyme.id}-${Date.now()}.png`;
    a.click();
  };

  const catalyticNote = selection
    ? enzyme.catalyticResidues.find((r) => r.chain === selection.chain && r.resi === selection.resi)?.role
    : undefined;

  return (
    <div className="space-y-10">
      <header className="relative border-b border-stage-700/70 pb-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="eyebrow">{enzyme.class} · {enzyme.family}</div>
        </div>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-tight text-paper-50 text-balance">
          {enzyme.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm">
          <span className="text-catalytic-gold">EC {enzyme.ecNumber}</span>
          <span className="text-paper-300">PDB {enzyme.pdbId}</span>
          <span className="italic text-paper-300">{enzyme.organism}</span>
        </div>
        <p className="mt-5 max-w-4xl font-display text-lg leading-relaxed text-paper-100 text-pretty">
          {enzyme.summary}
        </p>
        <div className="mt-5 rounded-md border-l-2 border-catalytic-gold bg-catalytic-gold/5 pl-4 py-3">
          <div className="eyebrow text-catalytic-gold">Mechanistic insight</div>
          <p className="mt-1 text-sm leading-relaxed text-paper-100 text-pretty">{enzyme.keyInsight}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {enzyme.tags.map((t) => (
            <span key={t} className="kicker">
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="relative">
            <MolstarViewer
              ref={viewerRef}
              pdbId={enzyme.pdbId}
              catalyticResidues={enzyme.catalyticResidues}
              initialRepresentation={representation}
              initialColor={color}
              onResidueClick={handleResidueClick}
              className="h-[560px] rounded-xl border border-stage-700/70 shadow-lift"
            />
            <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
              <ViewerControls
                representation={representation}
                color={color}
                spinning={spinning}
                onRepresentationChange={handleRepChange}
                onColorChange={handleColorChange}
                onToggleSpin={handleToggleSpin}
                onScreenshot={handleScreenshot}
              />
              <div className="pointer-events-auto max-w-[320px]">
                {selection && !mutationOpen && (
                  <ResidueInspector
                    selection={selection}
                    catalyticNote={catalyticNote}
                    onClose={() => setSelection(null)}
                    onFocus={(s) => viewerRef.current?.focusResidue(s.chain, s.resi)}
                    onMutate={() => setMutationOpen(true)}
                  />
                )}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4">
              {mutationOpen && (
                <MutationTool
                  atoms={atoms}
                  selection={selection}
                  onClose={() => setMutationOpen(false)}
                />
              )}
            </div>
          </div>

          {mechanism && <MechanismStepper mechanism={mechanism} onStepChange={setStepHighlight} />}

          {kinetics && <KineticsPanel kinetics={kinetics} />}

          {kinetics && <KineticSimulator kinetics={kinetics} enzymeName={enzyme.shortName ?? enzyme.name} />}

          <div className="grid gap-4 md:grid-cols-2">
            <article className="panel p-5">
              <div className="eyebrow">Biological context</div>
              <p className="mt-2 text-sm leading-relaxed text-paper-100 text-pretty">{enzyme.biologicalContext}</p>
            </article>
            <article className="panel p-5">
              <div className="eyebrow">Why this enzyme is in the catalog</div>
              <p className="mt-2 text-sm leading-relaxed text-paper-100 text-pretty">{enzyme.pedagogicalNotes}</p>
            </article>
          </div>
        </div>

        <aside className="space-y-4">
          <MetaCard enzyme={enzyme} />
          <CatalyticResiduesCard residues={enzyme.catalyticResidues} />
        </aside>
      </div>
    </div>
  );
}

function CatalyticResiduesCard({ residues }: { residues: CatalyticResidue[] }) {
  return (
    <div className="panel p-5">
      <div className="eyebrow">Catalytic residues</div>
      <ul className="mt-3 space-y-3">
        {residues.map((r, i) => (
          <li key={`${r.chain}-${r.resi}`} className="flex items-start gap-2.5">
            <div
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: CYCLE_HEX[i % CYCLE_HEX.length] }}
            />
            <div>
              <div className="font-mono text-sm text-paper-50">
                {r.resn}{r.resi}
                <span className="ml-1 text-paper-400">chain {r.chain}</span>
              </div>
              <div className="text-xs leading-relaxed text-paper-200 text-pretty">{r.role}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CYCLE_HEX = ['#e8b86d', '#d4613a', '#4e9e8c', '#8b5a9f', '#c4a775', '#7ba8a3'];
