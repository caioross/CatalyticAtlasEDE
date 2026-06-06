// Gaussian molecular surface via marching cubes.
//
// We use three.js's MarchingCubes (normally used for metaballs) seeded with
// one Gaussian-ish ball per atom, run a single update pass, then bake the
// resulting surface mesh into a static BufferGeometry in world-space. Finally,
// every surface vertex is coloured by looking up the nearest Cα and copying
// its per-atom colour — this gives the characteristic "chain-coloured
// surface" look without having to sample the density field in colour space.

import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import type { CAAtom } from '@/lib/pdb';

export type SurfaceOptions = {
  resolution?: number;      // cubic grid resolution — 80..128 is reasonable
  ballStrength?: number;    // per-atom contribution
  ballSubtract?: number;    // falloff — higher = tighter
  isolation?: number;       // iso level (lower = fatter surface)
  padding?: number;         // extra Å around the protein bounding sphere
};

const DEFAULTS: Required<SurfaceOptions> = {
  resolution: 96,
  ballStrength: 0.35,
  ballSubtract: 10,
  isolation: 30,
  padding: 5,
};

export type BuiltSurface = {
  geometry: THREE.BufferGeometry;
  // Per-atom colour array the caller supplied (stored so colour changes can
  // reuse the same vertex → nearestAtom mapping without rebuilding the
  // marching-cubes pass).
  vertexToAtom: Int32Array;
};

export function buildGaussianSurface(
  atoms: CAAtom[],
  caColors: Float32Array,
  options: SurfaceOptions = {},
): BuiltSurface | null {
  if (atoms.length < 2) return null;
  const opts = { ...DEFAULTS, ...options };

  // Bounding sphere for normalization.
  let cx = 0, cy = 0, cz = 0;
  for (const a of atoms) {
    cx += a.x; cy += a.y; cz += a.z;
  }
  cx /= atoms.length; cy /= atoms.length; cz /= atoms.length;
  let maxR = 0;
  for (const a of atoms) {
    const dx = a.x - cx, dy = a.y - cy, dz = a.z - cz;
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (r > maxR) maxR = r;
  }
  const scale = maxR + opts.padding;

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 0.08,
    roughness: 0.55,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mc = new MarchingCubes(opts.resolution, material, false, true, 100_000);
  mc.isolation = opts.isolation;
  mc.enableColors = true;
  mc.reset();

  // Add one metaball per atom. Positions map the protein bounding sphere into
  // [-1..1] (addBall internally expects [0..1]).
  for (const a of atoms) {
    const nx = (a.x - cx) / scale; // [-1, 1]
    const ny = (a.y - cy) / scale;
    const nz = (a.z - cz) / scale;
    const bx = (nx + 1) * 0.5;
    const by = (ny + 1) * 0.5;
    const bz = (nz + 1) * 0.5;
    mc.addBall(bx, by, bz, opts.ballStrength, opts.ballSubtract);
  }
  // Regenerate the mesh from the seeded field.
  mc.update();

  // Extract the current vertex buffer — MarchingCubes writes directly into
  // the BufferAttributes and sets drawRange. We need to clone the in-use
  // slice into a new BufferGeometry (without three.js messing with it next
  // frame).
  const drawCount = mc.count;
  if (drawCount < 3) return null;

  const srcPos = mc.geometry.attributes.position.array as Float32Array;
  const srcNor = mc.geometry.attributes.normal.array as Float32Array;

  const positions = new Float32Array(drawCount * 3);
  const normals = new Float32Array(drawCount * 3);
  positions.set(srcPos.subarray(0, drawCount * 3));
  normals.set(srcNor.subarray(0, drawCount * 3));

  // Transform from [-1, 1]ish cube space back to world coords.
  // MarchingCubes lays the field in [-1, 1] centered at origin. We need to
  // scale by `scale` and translate by (cx, cy, cz).
  for (let i = 0; i < drawCount; i++) {
    positions[i * 3 + 0] = positions[i * 3 + 0] * scale + cx;
    positions[i * 3 + 1] = positions[i * 3 + 1] * scale + cy;
    positions[i * 3 + 2] = positions[i * 3 + 2] * scale + cz;
  }

  // For each vertex find nearest Cα via an O(N*V) scan. For protein CA counts
  // (< 1000) and typical drawCount (< 80k) this is on the order of 10–80M
  // operations which runs in ~100–500ms on initial paint; good enough.
  const vertexToAtom = new Int32Array(drawCount);
  for (let v = 0; v < drawCount; v++) {
    const px = positions[v * 3 + 0];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];
    let best = 0;
    let bestD2 = Infinity;
    for (let a = 0; a < atoms.length; a++) {
      const at = atoms[a];
      const dx = at.x - px, dy = at.y - py, dz = at.z - pz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = a; }
    }
    vertexToAtom[v] = best;
  }

  const colors = new Float32Array(drawCount * 3);
  for (let v = 0; v < drawCount; v++) {
    const a = vertexToAtom[v];
    colors[v * 3 + 0] = caColors[a * 3 + 0] ?? 0.85;
    colors[v * 3 + 1] = caColors[a * 3 + 1] ?? 0.7;
    colors[v * 3 + 2] = caColors[a * 3 + 2] ?? 0.4;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeBoundingSphere();

  // dispose the MarchingCubes object since we cloned everything we needed.
  (mc.geometry as THREE.BufferGeometry).dispose();
  material.dispose();

  return { geometry: geom, vertexToAtom };
}

// Update only the colour attribute on an existing surface (used when the
// color scheme changes without changing the isosurface).
export function recolorSurface(
  geometry: THREE.BufferGeometry,
  vertexToAtom: Int32Array,
  caColors: Float32Array,
): void {
  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  const colors = colorAttr.array as Float32Array;
  for (let v = 0; v < vertexToAtom.length; v++) {
    const a = vertexToAtom[v];
    colors[v * 3 + 0] = caColors[a * 3 + 0] ?? 0.85;
    colors[v * 3 + 1] = caColors[a * 3 + 1] ?? 0.7;
    colors[v * 3 + 2] = caColors[a * 3 + 2] ?? 0.4;
  }
  colorAttr.needsUpdate = true;
}
