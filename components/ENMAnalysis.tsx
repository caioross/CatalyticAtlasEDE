'use client';

import { useMemo, useState } from 'react';
import { Upload, Download, Play, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parsePdbCA, fetchPdbText, summarizeChains, type CAAtom } from '@/lib/pdb';
import { runENM, DEFAULT_ENM_OPTIONS, type ENMOptions } from '@/lib/enm';
import type { ENMResult } from '@/lib/types';
import Heatmap from './Heatmap';
import PerResiduePlot from './PerResiduePlot';
import ModeViewer from './ModeViewer';
import SteeredANMPanel from './SteeredANMPanel';
import PathwayFinder from './PathwayFinder';

type Stage = 'idle' | 'loaded' | 'running' | 'done' | 'error';

export default function ENMAnalysis() {
  const [atoms, setAtoms] = useState<CAAtom[] | null>(null);
  const [source, setSource] = useState<string>('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<ENMResult | null>(null);
  const [opts, setOpts] = useState<ENMOptions>(DEFAULT_ENM_OPTIONS);
  const [activeMode, setActiveMode] = useState(0);
  const [amplitude, setAmplitude] = useState(6);

  const chainSummary = useMemo(() => (atoms ? summarizeChains(atoms) : []), [atoms]);

  async function handlePdbId(id: string) {
    if (!id.trim()) return;
    try {
      setStage('idle');
      setError('');
      const text = await fetchPdbText(id);
      const parsed = parsePdbCA(text);
      if (parsed.length === 0) throw new Error('No CA atoms found. Is this a valid structure?');
      setAtoms(parsed);
      setSource(`PDB ${id.toUpperCase()} · ${parsed.length} Cα atoms`);
      setStage('loaded');
      setResult(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load PDB');
      setStage('error');
    }
  }

  async function handleFile(file: File) {
    try {
      setStage('idle');
      setError('');
      const text = await file.text();
      const parsed = parsePdbCA(text);
      if (parsed.length === 0) throw new Error('No Cα atoms found in uploaded file.');
      setAtoms(parsed);
      setSource(`${file.name} · ${parsed.length} Cα atoms`);
      setStage('loaded');
      setResult(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to parse file');
      setStage('error');
    }
  }

  function runAnalysis() {
    if (!atoms) return;
    setStage('running');
    setError('');
    setTimeout(() => {
      try {
        const r = runENM(atoms, opts);
        setResult(r);
        setStage('done');
        setActiveMode(0);
      } catch (err: any) {
        setError(err?.message ?? 'ENM failed');
        setStage('error');
      }
    }, 30);
  }

  function downloadResult() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enm-result.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <div className="mb-4">
          <div className="eyebrow">Input structure</div>
          <div className="mt-1 text-sm text-paper-200">
            Upload a PDB file or fetch from RCSB by ID. Only Cα atoms are used.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stage-700/80 bg-stage-900/50 px-4 py-8 text-center transition hover:border-catalytic-gold/60 hover:bg-stage-900/80">
            <Upload size={18} className="text-paper-400 transition group-hover:text-catalytic-gold" />
            <div className="text-sm text-paper-100">Upload .pdb file</div>
            <div className="font-mono text-2xs text-paper-400">drop-in or click to choose</div>
            <input
              type="file"
              accept=".pdb,.ent,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>

          <form
            className="flex flex-col gap-2 rounded-lg border border-stage-700/60 bg-stage-900/60 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const id = (e.currentTarget.elements.namedItem('pdbId') as HTMLInputElement).value;
              handlePdbId(id);
            }}
          >
            <div className="text-sm text-paper-100">Fetch PDB ID</div>
            <div className="flex gap-2">
              <input
                name="pdbId"
                placeholder="e.g. 1AKI"
                className="flex-1 rounded-md border border-stage-700 bg-stage-950 px-2 py-1.5 font-mono text-sm uppercase text-paper-50 outline-none transition focus:border-catalytic-gold"
                maxLength={8}
              />
              <button type="submit" className="btn">
                Fetch
              </button>
            </div>
            <div className="font-mono text-2xs text-paper-400">
              Any entry from rcsb.org — structure, enzyme or not.
            </div>
          </form>
        </div>

        {stage === 'error' && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-catalytic-terra/40 bg-catalytic-terra/5 p-3 text-xs text-catalytic-terra">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {atoms && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-stage-700/60 bg-stage-900/60 p-3">
            <FileText size={14} className="text-catalytic-gold" />
            <span className="font-mono text-xs text-paper-100">{source}</span>
            <div className="ml-auto flex flex-wrap gap-2 text-2xs font-mono text-paper-300">
              {chainSummary.map((c) => (
                <span key={c.chain} className="tabular rounded border border-stage-700/80 bg-stage-950/70 px-2 py-0.5">
                  {c.chain}: {c.firstResi}–{c.lastResi} ({c.length})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {atoms && (
        <div className="panel p-5">
          <div className="mb-4">
            <div className="eyebrow">Analysis parameters</div>
            <div className="mt-1 text-sm text-paper-200">
              Anisotropic Network Model (ANM) — one Cα per residue, harmonic springs within a cutoff radius.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ParamSlider
              label="Cutoff radius (Å)"
              value={opts.cutoff}
              min={8}
              max={20}
              step={0.5}
              onChange={(v) => setOpts((o) => ({ ...o, cutoff: v }))}
              hint="Pairs of Cα within this distance are connected by springs. 13 Å is the canonical ANM default."
            />
            <ParamSlider
              label="Spring constant γ"
              value={opts.gamma}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(v) => setOpts((o) => ({ ...o, gamma: v }))}
              hint="Isotropic stiffness — sets the absolute eigenvalue scale but not the mode shapes."
            />
            <ParamSlider
              label="Number of modes"
              value={opts.numModes}
              min={5}
              max={40}
              step={1}
              onChange={(v) => setOpts((o) => ({ ...o, numModes: Math.round(v) }))}
              hint="The six lowest eigenvalues are rigid-body motions (skipped). Slow non-trivial modes come next."
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={runAnalysis}
              disabled={stage === 'running'}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={14} />
              {stage === 'running' ? 'Running ANM…' : 'Run ANM analysis'}
            </button>
            <div className="font-mono text-2xs text-paper-400">
              {atoms.length} Cα · Hessian {3 * atoms.length} × {3 * atoms.length}
              {atoms.length > 600 && ' · this may take 10–30 s'}
            </div>
          </div>
        </div>
      )}

      {stage === 'running' && (
        <div className="panel p-10 text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-stage-700 border-t-catalytic-gold" />
          <div className="text-sm text-paper-100">Building Hessian and diagonalising…</div>
          <div className="mt-1 font-mono text-2xs text-paper-400">
            Running fully in your browser. No data leaves your machine.
          </div>
        </div>
      )}

      {result && (
        <ResultView
          atoms={atoms!}
          result={result}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          amplitude={amplitude}
          setAmplitude={setAmplitude}
          onDownload={downloadResult}
        />
      )}
    </div>
  );
}

function ParamSlider({
  label, value, min, max, step, onChange, hint,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded-md border border-stage-700/60 bg-stage-900/50 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-paper-100">{label}</span>
        <span className="tabular font-mono text-xs text-catalytic-gold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-catalytic-gold"
      />
      {hint && <div className="font-mono text-2xs leading-snug text-paper-400">{hint}</div>}
    </label>
  );
}

function ResultView({
  atoms,
  result,
  activeMode,
  setActiveMode,
  amplitude,
  setAmplitude,
  onDownload,
}: {
  atoms: CAAtom[];
  result: ENMResult;
  activeMode: number;
  setActiveMode: (n: number) => void;
  amplitude: number;
  setAmplitude: (n: number) => void;
  onDownload: () => void;
}) {
  const mode = result.modes[activeMode];
  const displacements = useMemo(
    () =>
      mode
        ? mode.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z))
        : [],
    [mode],
  );

  const topBc = useMemo(() => {
    const indexed = result.betweenness.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => b.v - a.v);
    return indexed.slice(0, 10);
  }, [result]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stage-800/70 pt-6">
        <div>
          <div className="eyebrow">§ Results</div>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-paper-50">
            {result.n} residues · {result.modes.length} non-trivial slow modes
          </h2>
        </div>
        <button onClick={onDownload} className="btn">
          <Download size={12} />
          Download JSON
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {mode && <ModeViewer atoms={atoms} mode={mode} amplitude={amplitude} />}

        <div className="flex flex-col gap-3">
          <div className="panel p-4">
            <div className="flex items-baseline justify-between">
              <div className="eyebrow">Animation amplitude</div>
              <div className="tabular font-mono text-xs text-catalytic-gold">{amplitude} Å</div>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={amplitude}
              onChange={(e) => setAmplitude(parseFloat(e.target.value))}
              className="mt-2 w-full accent-catalytic-gold"
            />
          </div>

          <div className="panel flex-1 p-4">
            <div className="mb-2 eyebrow">Normal modes (lowest non-trivial)</div>
            <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
              {result.modes.map((m, i) => (
                <button
                  key={m.index}
                  onClick={() => setActiveMode(i)}
                  className={cn(
                    'block w-full rounded-md border px-2 py-1.5 text-left text-xs transition',
                    activeMode === i
                      ? 'border-catalytic-gold/60 bg-catalytic-gold/10 text-catalytic-gold'
                      : 'border-stage-700/70 bg-stage-900/60 text-paper-100 hover:border-stage-600',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">Mode {m.index}</span>
                    <span className="font-mono text-2xs tabular text-paper-400">
                      λ {m.eigenvalue.toExponential(1)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-2xs text-paper-400">
                    <span className="tabular">{(m.collectivity * 100).toFixed(1)}%</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-stage-700/80">
                      <div
                        className="h-1 bg-catalytic-gold/80"
                        style={{ width: `${m.collectivity * 100}%` }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mode && (
        <PerResiduePlot
          title={`Mode ${mode.index} — per-residue displacement magnitude`}
          values={displacements}
          labels={result.residues}
          color="#e8b86d"
        />
      )}

      <Heatmap
        matrix={result.crossCorrelation}
        labels={result.residues}
        title="Dynamic cross-correlation (summed over all slow modes)"
        height={360}
      />

      <SteeredANMPanel atoms={atoms} result={result} />

      <PathwayFinder atoms={atoms} result={result} />

      <PerResiduePlot
        title="Betweenness centrality — allosteric communication hubs"
        values={result.betweenness}
        labels={result.residues}
        color="#4e9e8c"
        highlightIndices={topBc.map((x) => x.i)}
      />

      <div className="panel p-5">
        <div className="mb-3 eyebrow">Top 10 allosteric hubs (highest betweenness)</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {topBc.map(({ v, i }) => {
            const r = result.residues[i];
            return (
              <div
                key={`${r.chain}-${r.resi}`}
                className="rounded-md border border-stage-700/70 bg-stage-900/60 px-3 py-2"
              >
                <div className="font-mono text-xs text-catalytic-verdigris">
                  {r.resn}{r.resi}
                </div>
                <div className="font-mono text-2xs text-paper-400">chain {r.chain}</div>
                <div className="mt-1 font-mono text-2xs tabular text-paper-200">
                  BC = {v.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs leading-relaxed text-paper-200 text-pretty">
          Residues with high betweenness sit on many shortest paths through the dynamic correlation graph
          and are common targets for allosteric regulation and cryptic drug sites. Cross-reference these
          positions with known catalytic or binding residues to identify candidate allosteric couplings.
        </div>
      </div>
    </div>
  );
}
