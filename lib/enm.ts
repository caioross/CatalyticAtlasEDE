import { Matrix, EigenvalueDecomposition } from 'ml-matrix';
import type { CAAtom } from './pdb';
import type { ENMResult } from './types';

export type ENMOptions = {
  cutoff: number;
  gamma: number;
  numModes: number;
};

export const DEFAULT_ENM_OPTIONS: ENMOptions = {
  cutoff: 13.0,
  gamma: 1.0,
  numModes: 20,
};

function buildAnmHessian(atoms: CAAtom[], cutoff: number, gamma: number): Matrix {
  const N = atoms.length;
  const H = Matrix.zeros(3 * N, 3 * N);
  const cutoff2 = cutoff * cutoff;

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = atoms[j].x - atoms[i].x;
      const dy = atoms[j].y - atoms[i].y;
      const dz = atoms[j].z - atoms[i].z;
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 > cutoff2 || r2 < 1e-6) continue;

      const inv = gamma / r2;
      const hxx = -dx * dx * inv;
      const hyy = -dy * dy * inv;
      const hzz = -dz * dz * inv;
      const hxy = -dx * dy * inv;
      const hxz = -dx * dz * inv;
      const hyz = -dy * dz * inv;

      const ii = 3 * i;
      const jj = 3 * j;

      H.set(ii + 0, jj + 0, hxx); H.set(jj + 0, ii + 0, hxx);
      H.set(ii + 1, jj + 1, hyy); H.set(jj + 1, ii + 1, hyy);
      H.set(ii + 2, jj + 2, hzz); H.set(jj + 2, ii + 2, hzz);
      H.set(ii + 0, jj + 1, hxy); H.set(jj + 1, ii + 0, hxy);
      H.set(ii + 1, jj + 0, hxy); H.set(jj + 0, ii + 1, hxy);
      H.set(ii + 0, jj + 2, hxz); H.set(jj + 2, ii + 0, hxz);
      H.set(ii + 2, jj + 0, hxz); H.set(jj + 0, ii + 2, hxz);
      H.set(ii + 1, jj + 2, hyz); H.set(jj + 2, ii + 1, hyz);
      H.set(ii + 2, jj + 1, hyz); H.set(jj + 1, ii + 2, hyz);

      H.set(ii + 0, ii + 0, H.get(ii + 0, ii + 0) - hxx);
      H.set(ii + 1, ii + 1, H.get(ii + 1, ii + 1) - hyy);
      H.set(ii + 2, ii + 2, H.get(ii + 2, ii + 2) - hzz);
      H.set(ii + 0, ii + 1, H.get(ii + 0, ii + 1) - hxy);
      H.set(ii + 1, ii + 0, H.get(ii + 1, ii + 0) - hxy);
      H.set(ii + 0, ii + 2, H.get(ii + 0, ii + 2) - hxz);
      H.set(ii + 2, ii + 0, H.get(ii + 2, ii + 0) - hxz);
      H.set(ii + 1, ii + 2, H.get(ii + 1, ii + 2) - hyz);
      H.set(ii + 2, ii + 1, H.get(ii + 2, ii + 1) - hyz);

      H.set(jj + 0, jj + 0, H.get(jj + 0, jj + 0) - hxx);
      H.set(jj + 1, jj + 1, H.get(jj + 1, jj + 1) - hyy);
      H.set(jj + 2, jj + 2, H.get(jj + 2, jj + 2) - hzz);
      H.set(jj + 0, jj + 1, H.get(jj + 0, jj + 1) - hxy);
      H.set(jj + 1, jj + 0, H.get(jj + 1, jj + 0) - hxy);
      H.set(jj + 0, jj + 2, H.get(jj + 0, jj + 2) - hxz);
      H.set(jj + 2, jj + 0, H.get(jj + 2, jj + 0) - hxz);
      H.set(jj + 1, jj + 2, H.get(jj + 1, jj + 2) - hyz);
      H.set(jj + 2, jj + 1, H.get(jj + 2, jj + 1) - hyz);
    }
  }
  return H;
}

function collectivity(vec: number[]): number {
  const N = vec.length / 3;
  let sumSq = 0;
  const sq: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const dx = vec[3 * i];
    const dy = vec[3 * i + 1];
    const dz = vec[3 * i + 2];
    sq[i] = dx * dx + dy * dy + dz * dz;
    sumSq += sq[i];
  }
  if (sumSq < 1e-20) return 0;
  let entropy = 0;
  for (let i = 0; i < N; i++) {
    const p = sq[i] / sumSq;
    if (p > 1e-12) entropy -= p * Math.log(p);
  }
  return Math.exp(entropy) / N;
}

function computeCrossCorrelation(
  modes: { eigenvalue: number; vec: number[] }[],
  N: number,
): number[][] {
  const C = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const variance: number[] = new Array(N).fill(0);

  for (const m of modes) {
    const invL = 1 / m.eigenvalue;
    for (let i = 0; i < N; i++) {
      for (let j = i; j < N; j++) {
        const vix = m.vec[3 * i], viy = m.vec[3 * i + 1], viz = m.vec[3 * i + 2];
        const vjx = m.vec[3 * j], vjy = m.vec[3 * j + 1], vjz = m.vec[3 * j + 2];
        const dot = vix * vjx + viy * vjy + viz * vjz;
        C[i][j] += invL * dot;
      }
    }
  }
  for (let i = 0; i < N; i++) variance[i] = C[i][i];

  const out: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      const denom = Math.sqrt(variance[i] * variance[j]);
      const v = denom > 1e-20 ? C[i][j] / denom : 0;
      out[i][j] = v;
      out[j][i] = v;
    }
  }
  return out;
}

function brandesBetweenness(adj: number[][]): number[] {
  const N = adj.length;
  const bc = new Array<number>(N).fill(0);

  for (let s = 0; s < N; s++) {
    const stack: number[] = [];
    const P: number[][] = Array.from({ length: N }, () => []);
    const sigma = new Array<number>(N).fill(0);
    const dist = new Array<number>(N).fill(Infinity);
    sigma[s] = 1;
    dist[s] = 0;

    const queue: [number, number][] = [[0, s]];
    const visited = new Array<boolean>(N).fill(false);

    while (queue.length) {
      queue.sort((a, b) => a[0] - b[0]);
      const [d, v] = queue.shift()!;
      if (visited[v]) continue;
      visited[v] = true;
      stack.push(v);

      for (let w = 0; w < N; w++) {
        const edge = adj[v][w];
        if (edge <= 0 || !isFinite(edge)) continue;
        const nd = d + edge;
        if (nd < dist[w]) {
          dist[w] = nd;
          sigma[w] = sigma[v];
          P[w] = [v];
          queue.push([nd, w]);
        } else if (Math.abs(nd - dist[w]) < 1e-9) {
          sigma[w] += sigma[v];
          P[w].push(v);
        }
      }
    }

    const delta = new Array<number>(N).fill(0);
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of P[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) bc[w] += delta[w];
    }
  }

  const maxBc = Math.max(...bc, 1);
  return bc.map((v) => v / maxBc);
}

export function runENM(atoms: CAAtom[], options: Partial<ENMOptions> = {}): ENMResult {
  const opts = { ...DEFAULT_ENM_OPTIONS, ...options };
  const N = atoms.length;
  if (N < 4) throw new Error('ENM requires at least 4 residues.');
  if (N > 1200) {
    throw new Error(
      `Structure has ${N} residues — client-side ANM is limited to ~1200 residues. Consider a truncated chain.`,
    );
  }

  const H = buildAnmHessian(atoms, opts.cutoff, opts.gamma);
  const eig = new EigenvalueDecomposition(H, { assumeSymmetric: true });
  const evals = eig.realEigenvalues;
  const V = eig.eigenvectorMatrix;

  const indexed = evals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const firstNonTrivial = 6;

  const wantedModes = Math.min(opts.numModes, indexed.length - firstNonTrivial);
  const modeList: { eigenvalue: number; vec: number[] }[] = [];
  for (let k = firstNonTrivial; k < firstNonTrivial + wantedModes; k++) {
    const { v, i } = indexed[k];
    if (v < 1e-8) continue;
    const vec = new Array<number>(3 * N);
    for (let r = 0; r < 3 * N; r++) vec[r] = V.get(r, i);
    modeList.push({ eigenvalue: v, vec });
  }

  const allPositiveModes: { eigenvalue: number; vec: number[] }[] = [];
  for (let k = firstNonTrivial; k < indexed.length; k++) {
    const { v, i } = indexed[k];
    if (v < 1e-8) continue;
    const vec = new Array<number>(3 * N);
    for (let r = 0; r < 3 * N; r++) vec[r] = V.get(r, i);
    allPositiveModes.push({ eigenvalue: v, vec });
  }

  const crossCorr = computeCrossCorrelation(allPositiveModes, N);

  const adj: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const contactCutoff = opts.cutoff;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = atoms[j].x - atoms[i].x;
      const dy = atoms[j].y - atoms[i].y;
      const dz = atoms[j].z - atoms[i].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d <= contactCutoff) {
        const corr = Math.abs(crossCorr[i][j]);
        const w = 1 / (0.05 + corr);
        adj[i][j] = w;
        adj[j][i] = w;
      }
    }
  }
  const bc = brandesBetweenness(adj);

  const modes = modeList.map((m, idx) => {
    const vectors = Array.from({ length: N }, (_, i) => ({
      x: m.vec[3 * i],
      y: m.vec[3 * i + 1],
      z: m.vec[3 * i + 2],
    }));
    return {
      index: idx + 1,
      eigenvalue: m.eigenvalue,
      frequency: Math.sqrt(m.eigenvalue),
      collectivity: collectivity(m.vec),
      vectors,
    };
  });

  return {
    n: N,
    eigenvalues: modeList.map((m) => m.eigenvalue),
    eigenvectors: modeList.map((m) => m.vec),
    modes,
    crossCorrelation: crossCorr,
    betweenness: bc,
    residues: atoms.map((a) => ({
      chain: a.chain,
      resi: a.resi,
      resn: a.resn,
      x: a.x,
      y: a.y,
      z: a.z,
    })),
  };
}

export function animateAlongMode(
  atoms: CAAtom[],
  mode: ENMResult['modes'][number],
  amplitude: number,
  phase: number,
): CAAtom[] {
  const s = amplitude * Math.sin(phase);
  return atoms.map((a, i) => ({
    ...a,
    x: a.x + s * mode.vectors[i].x,
    y: a.y + s * mode.vectors[i].y,
    z: a.z + s * mode.vectors[i].z,
  }));
}

/**
 * Compute the quasi-harmonic response of the network to a force vector applied
 * at a single residue. Uses the Moore–Penrose pseudo-inverse of the Hessian over
 * the non-trivial modes:
 *
 *     Δr = H⁺ f = Σ_{k>6} (1/λ_k) (v_k · f) v_k
 *
 * This captures the "steered ANM" picture: grab a residue, pull, and the whole
 * protein relaxes harmonically along its soft modes. A spring-constant parameter
 * lets the caller dampen the response for interactive visualisation.
 */
export function steeredResponse(
  modes: ENMResult['modes'],
  eigenvalues: number[],
  eigenvectors: number[][],
  appliedAtomIndex: number,
  force: { x: number; y: number; z: number },
  springConstant = 1,
): { x: number; y: number; z: number }[] {
  if (!eigenvectors.length || eigenvectors[0].length % 3 !== 0) return [];
  const N = eigenvectors[0].length / 3;
  const out = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0 }));
  const fx = force.x / springConstant;
  const fy = force.y / springConstant;
  const fz = force.z / springConstant;

  for (let k = 0; k < eigenvalues.length; k++) {
    const lambda = eigenvalues[k];
    if (lambda < 1e-6) continue;
    const v = eigenvectors[k];
    const vx = v[3 * appliedAtomIndex];
    const vy = v[3 * appliedAtomIndex + 1];
    const vz = v[3 * appliedAtomIndex + 2];
    const dot = vx * fx + vy * fy + vz * fz;
    const scale = dot / lambda;
    if (Math.abs(scale) < 1e-10) continue;
    for (let i = 0; i < N; i++) {
      out[i].x += scale * v[3 * i];
      out[i].y += scale * v[3 * i + 1];
      out[i].z += scale * v[3 * i + 2];
    }
  }
  void modes;
  return out;
}

/**
 * Apply a precomputed displacement field to a Cα set, producing new coordinates.
 * Used by the steered-ANM UI to render the deformed network at any amplitude.
 */
export function applyDisplacement(
  atoms: CAAtom[],
  displacement: { x: number; y: number; z: number }[],
  amplitude: number,
): CAAtom[] {
  return atoms.map((a, i) => ({
    ...a,
    x: a.x + amplitude * (displacement[i]?.x ?? 0),
    y: a.y + amplitude * (displacement[i]?.y ?? 0),
    z: a.z + amplitude * (displacement[i]?.z ?? 0),
  }));
}

/**
 * Dijkstra shortest-path over the dynamic residue graph.
 * Edge weights are 1 / (ε + |cross-correlation|) so that residues that move
 * together are "closer" in dynamic space. Returns the ordered residue indices
 * from start to end, plus the cumulative weight.
 *
 * This is the core of the allosteric-pathway finder: click any two residues
 * and see how allosteric signal can propagate through correlated motion.
 */
export function dynamicPath(
  crossCorrelation: number[][],
  contactCutoff: number,
  atoms: CAAtom[],
  startIdx: number,
  endIdx: number,
): { path: number[]; distance: number } | null {
  const N = atoms.length;
  if (startIdx < 0 || endIdx < 0 || startIdx >= N || endIdx >= N) return null;

  const dist = new Array<number>(N).fill(Infinity);
  const prev = new Array<number>(N).fill(-1);
  const visited = new Array<boolean>(N).fill(false);
  dist[startIdx] = 0;

  for (let iter = 0; iter < N; iter++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < N; i++) {
      if (!visited[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === endIdx) break;
    visited[u] = true;

    const au = atoms[u];
    for (let v = 0; v < N; v++) {
      if (visited[v] || v === u) continue;
      const av = atoms[v];
      const dx = av.x - au.x;
      const dy = av.y - au.y;
      const dz = av.z - au.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > contactCutoff) continue;
      const corr = Math.abs(crossCorrelation[u]?.[v] ?? 0);
      const w = 1 / (0.05 + corr);
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  if (!isFinite(dist[endIdx])) return null;

  const path: number[] = [];
  for (let at = endIdx; at !== -1; at = prev[at]) {
    path.push(at);
    if (at === startIdx) break;
  }
  path.reverse();
  if (path[0] !== startIdx) return null;

  return { path, distance: dist[endIdx] };
}

export function atomsToPdb(atoms: CAAtom[]): string {
  const lines: string[] = [];
  atoms.forEach((a, idx) => {
    const serial = String(idx + 1).padStart(5, ' ');
    const name = ' CA ';
    const resn = a.resn.padEnd(3, ' ').slice(0, 3);
    const chain = (a.chain || 'A').slice(0, 1);
    const resi = String(a.resi).padStart(4, ' ');
    const x = a.x.toFixed(3).padStart(8, ' ');
    const y = a.y.toFixed(3).padStart(8, ' ');
    const z = a.z.toFixed(3).padStart(8, ' ');
    lines.push(
      `ATOM  ${serial} ${name} ${resn} ${chain}${resi}    ${x}${y}${z}  1.00  0.00           C`,
    );
  });
  lines.push('END');
  return lines.join('\n');
}
