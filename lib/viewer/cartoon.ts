// Secondary-structure-aware cartoon geometry builder.
//
// Given the Cα trace of a chain and a secondary-structure string, we produce
// one indexed THREE.BufferGeometry whose cross-section at each sample point
// morphs smoothly from a round tube (coil) to a flat wide ribbon (helix) to a
// flatter ribbon with a tapered arrow-tip (β-strand). Orientation is given by
// a parallel-transport frame that does not flip along the curve.
//
// Output: a single BufferGeometry with per-vertex position, normal, and color.
// Colors are interpolated from a per-Cα colour Float32Array supplied by the
// caller — this decouples geometry from the active color scheme.

import * as THREE from 'three';
import type { CAAtom } from '@/lib/pdb';
import type { SSCode } from './ss';
import { segmentsForChain } from './ss';

const CROSS_SECTION_VERTS = 10;

// Reference polygon, 10 points on the unit octagon-ish ellipse. Given width w
// and height h at a given sample, the cross-section in the (N, B) frame plane
// is (w * ref.x, h * ref.y). Height direction is binormal, width is normal.
const REF_CROSS: { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k < CROSS_SECTION_VERTS; k++) {
    const t = (k / CROSS_SECTION_VERTS) * Math.PI * 2;
    out.push({ x: Math.cos(t), y: Math.sin(t) });
  }
  return out;
})();

type ProfilePoint = {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  width: number;
  height: number;
  color: THREE.Color;
  capStart?: boolean; // flat cap at the start (first sample of an arrow-head)
  capEnd?: boolean;   // flat cap at the end (tip of an arrow)
};

// Cross-section dims for each SS kind, in Å.
const PROFILE: Record<SSCode, { width: number; height: number }> = {
  H: { width: 1.55, height: 0.34 }, // flat ribbon
  E: { width: 1.45, height: 0.24 }, // thinner flat ribbon for sheets
  C: { width: 0.42, height: 0.42 }, // round tube
};
const ARROW_HEAD_WIDTH = 2.4; // widens at the start of the arrow head
const ARROW_HEAD_TIP_WIDTH = 0.15;
const SAMPLES_PER_RESIDUE = 8;

function lerpVec(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  );
}

function rotateVec(v: THREE.Vector3, axis: THREE.Vector3, angle: number, out: THREE.Vector3): THREE.Vector3 {
  // Rodrigues rotation
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = 1 - c;
  const dot = axis.x * v.x + axis.y * v.y + axis.z * v.z;
  const cx = axis.y * v.z - axis.z * v.y;
  const cy = axis.z * v.x - axis.x * v.z;
  const cz = axis.x * v.y - axis.y * v.x;
  out.set(
    v.x * c + cx * s + axis.x * dot * k,
    v.y * c + cy * s + axis.y * dot * k,
    v.z * c + cz * s + axis.z * dot * k,
  );
  return out;
}

type ChainCartoonOptions = {
  atoms: CAAtom[];
  ss: SSCode[];
  caColors: Float32Array; // 3 floats per Cα
};

export function buildChainCartoon({ atoms, ss, caColors }: ChainCartoonOptions): THREE.BufferGeometry | null {
  const N = atoms.length;
  if (N < 2) return null;

  // Catmull-Rom through all CAs for smoothness.
  const points = atoms.map((a) => new THREE.Vector3(a.x, a.y, a.z));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);

  // Determine SS segments; also detect strand segments so we can taper the end
  // of each strand into an arrow head spanning its last residue.
  const segments = segmentsForChain(ss);
  const arrowStart = new Set<number>(); // residue index where arrow taper begins
  for (const seg of segments) {
    if (seg.kind === 'E' && seg.end >= seg.start + 1) {
      arrowStart.add(seg.end); // last residue of the strand is the arrow head
    }
  }

  // Total samples along the whole chain. We sample uniformly in residue-space:
  // residue i occupies the t interval [i/(N-1), (i+1)/(N-1)]. Each residue
  // receives SAMPLES_PER_RESIDUE sub-samples.
  const totalSamples = (N - 1) * SAMPLES_PER_RESIDUE + 1;
  const profile: ProfilePoint[] = [];

  // Precompute tangents and parallel-transport frames.
  const tangents: THREE.Vector3[] = new Array(totalSamples);
  for (let s = 0; s < totalSamples; s++) {
    const t = s / (totalSamples - 1);
    tangents[s] = curve.getTangentAt(t).normalize();
  }

  // Initial normal: anything perpendicular to the first tangent.
  const normals: THREE.Vector3[] = new Array(totalSamples);
  const binormals: THREE.Vector3[] = new Array(totalSamples);
  {
    const t0 = tangents[0];
    const ref = Math.abs(t0.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const n0 = new THREE.Vector3().crossVectors(ref, t0).normalize();
    const b0 = new THREE.Vector3().crossVectors(t0, n0).normalize();
    normals[0] = n0;
    binormals[0] = b0;
  }
  const axis = new THREE.Vector3();
  const rotated = new THREE.Vector3();
  for (let s = 1; s < totalSamples; s++) {
    const tp = tangents[s - 1];
    const tc = tangents[s];
    axis.crossVectors(tp, tc);
    const axisLen = axis.length();
    if (axisLen < 1e-6) {
      normals[s] = normals[s - 1].clone();
    } else {
      axis.divideScalar(axisLen);
      const dot = Math.max(-1, Math.min(1, tp.dot(tc)));
      const ang = Math.acos(dot);
      rotateVec(normals[s - 1], axis, ang, rotated);
      normals[s] = rotated.clone();
    }
    binormals[s] = new THREE.Vector3().crossVectors(tangents[s], normals[s]).normalize();
  }

  // For strand segments, rotate the parallel-transported frame so the ribbon's
  // wide face is aligned with the "sheet plane" (the plane containing three
  // consecutive CAs). This reproduces the characteristic β-sheet look where
  // the flat of each strand faces outward.
  const strandAlign = new Float32Array(totalSamples);
  for (const seg of segments) {
    if (seg.kind !== 'E') continue;
    // compute a stable normal for the strand from its middle triple
    const mid = Math.floor((seg.start + seg.end) / 2);
    if (mid < 1 || mid >= atoms.length - 1) continue;
    const a = new THREE.Vector3(atoms[mid - 1].x, atoms[mid - 1].y, atoms[mid - 1].z);
    const b = new THREE.Vector3(atoms[mid].x, atoms[mid].y, atoms[mid].z);
    const c = new THREE.Vector3(atoms[mid + 1].x, atoms[mid + 1].y, atoms[mid + 1].z);
    const ab = new THREE.Vector3().subVectors(a, b);
    const cb = new THREE.Vector3().subVectors(c, b);
    const sheetN = new THREE.Vector3().crossVectors(ab, cb).normalize();
    for (let r = seg.start; r <= seg.end; r++) {
      // Sample indices for this residue:
      const s0 = r * SAMPLES_PER_RESIDUE;
      const s1 = Math.min(totalSamples - 1, s0 + SAMPLES_PER_RESIDUE);
      for (let s = s0; s < s1; s++) {
        // angle between current binormal and desired sheetN, around tangent.
        const T = tangents[s];
        // project sheetN onto plane perpendicular to T
        const projD = sheetN.dot(T);
        const proj = new THREE.Vector3(
          sheetN.x - projD * T.x,
          sheetN.y - projD * T.y,
          sheetN.z - projD * T.z,
        );
        const pl = proj.length();
        if (pl < 1e-6) continue;
        proj.divideScalar(pl);
        // angle between current binormal and proj
        const B = binormals[s];
        const cosA = Math.max(-1, Math.min(1, B.dot(proj)));
        const cross = new THREE.Vector3().crossVectors(B, proj);
        const sign = Math.sign(cross.dot(T)) || 1;
        strandAlign[s] = sign * Math.acos(cosA);
      }
    }
  }
  // Apply the rotation gradually in/out across strand boundaries so ribbons
  // don't pop: ramp the rotation angle up over the first half-residue and
  // down over the last half-residue. We blend by zeroing at segment edges.

  // Build profile sample by sample.
  const tmpColor = new THREE.Color();
  for (let s = 0; s < totalSamples; s++) {
    const t = s / (totalSamples - 1);
    const residueFloat = t * (N - 1);
    const iLow = Math.max(0, Math.min(N - 1, Math.floor(residueFloat)));
    const iHigh = Math.min(N - 1, iLow + 1);
    const localT = residueFloat - iLow;

    // SS at this sample: use ss[iLow]. For smooth shape transitions we blend
    // over the last 20% of one residue and first 20% of the next when SS
    // changes.
    const ssLow = ss[iLow];
    const ssHigh = ss[iHigh] ?? ssLow;
    const pLow = PROFILE[ssLow];
    const pHigh = PROFILE[ssHigh];
    let widthA = pLow.width;
    let heightA = pLow.height;
    let widthB = pHigh.width;
    let heightB = pHigh.height;

    // Arrow head override: if we're in the last residue of a strand, widen
    // then taper width so it looks like an arrow.
    if (arrowStart.has(iLow)) {
      // iLow is the strand's final residue; width goes from base strand width
      // at entry to ARROW_HEAD_TIP_WIDTH at exit, with a bump up to
      // ARROW_HEAD_WIDTH at the start.
      const pStrand = PROFILE.E;
      if (localT < 0.05) {
        widthA = pStrand.width;
      } else if (localT < 0.1) {
        // jump up to ARROW_HEAD_WIDTH (creates the back of the arrow).
        widthA = ARROW_HEAD_WIDTH;
      } else {
        const tt = (localT - 0.1) / 0.9;
        widthA = ARROW_HEAD_WIDTH + (ARROW_HEAD_TIP_WIDTH - ARROW_HEAD_WIDTH) * tt;
      }
      heightA = pStrand.height;
    }
    if (arrowStart.has(iHigh)) {
      // The "high" side is only relevant at residue boundary — we don't taper
      // using it.
    }

    const width = widthA * (1 - localT) + widthB * localT;
    const height = heightA * (1 - localT) + heightB * localT;

    // Color lerp across the two Cα colours.
    const cLowR = caColors[iLow * 3 + 0];
    const cLowG = caColors[iLow * 3 + 1];
    const cLowB = caColors[iLow * 3 + 2];
    const cHighR = caColors[iHigh * 3 + 0];
    const cHighG = caColors[iHigh * 3 + 1];
    const cHighB = caColors[iHigh * 3 + 2];
    const cR = cLowR * (1 - localT) + cHighR * localT;
    const cG = cLowG * (1 - localT) + cHighG * localT;
    const cB = cLowB * (1 - localT) + cHighB * localT;

    // Strand frame alignment: rotate normal & binormal around tangent by
    // strandAlign[s] if in a strand.
    const rotAngle = strandAlign[s];
    const T = tangents[s];
    let Nv = normals[s];
    let Bv = binormals[s];
    if (Math.abs(rotAngle) > 1e-6 && ssLow === 'E') {
      const rn = new THREE.Vector3();
      const rb = new THREE.Vector3();
      rotateVec(Nv, T, rotAngle, rn);
      rotateVec(Bv, T, rotAngle, rb);
      Nv = rn;
      Bv = rb;
    }

    profile.push({
      pos: curve.getPointAt(t),
      tangent: T,
      normal: Nv.clone(),
      binormal: Bv.clone(),
      width,
      height,
      color: tmpColor.setRGB(cR, cG, cB).clone(),
    });
  }

  // Build indexed geometry.
  const M = profile.length;
  const V = CROSS_SECTION_VERTS;
  const positions = new Float32Array(M * V * 3);
  const normalsArr = new Float32Array(M * V * 3);
  const colorsArr = new Float32Array(M * V * 3);
  const indices: number[] = [];

  const tmp = new THREE.Vector3();
  for (let s = 0; s < M; s++) {
    const p = profile[s];
    for (let k = 0; k < V; k++) {
      const ref = REF_CROSS[k];
      // position in frame plane
      tmp
        .copy(p.pos)
        .addScaledVector(p.normal, ref.x * p.width)
        .addScaledVector(p.binormal, ref.y * p.height);
      const idx = (s * V + k) * 3;
      positions[idx + 0] = tmp.x;
      positions[idx + 1] = tmp.y;
      positions[idx + 2] = tmp.z;
      // normal — radial from spine
      const nx = p.normal.x * ref.x + p.binormal.x * ref.y;
      const ny = p.normal.y * ref.x + p.binormal.y * ref.y;
      const nz = p.normal.z * ref.x + p.binormal.z * ref.y;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normalsArr[idx + 0] = nx / nl;
      normalsArr[idx + 1] = ny / nl;
      normalsArr[idx + 2] = nz / nl;
      colorsArr[idx + 0] = p.color.r;
      colorsArr[idx + 1] = p.color.g;
      colorsArr[idx + 2] = p.color.b;
    }
  }
  // Connect consecutive rings into quads.
  for (let s = 0; s < M - 1; s++) {
    for (let k = 0; k < V; k++) {
      const a = s * V + k;
      const b = s * V + ((k + 1) % V);
      const c = (s + 1) * V + k;
      const d = (s + 1) * V + ((k + 1) % V);
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  // End caps (flat triangle fans) at chain start and end so we don't see into
  // the tube.
  const addFanCap = (ringStart: number, reverse = false) => {
    const centerIdx = positions.length / 3;
    // compute ring centroid
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < V; k++) {
      cx += positions[(ringStart + k) * 3 + 0];
      cy += positions[(ringStart + k) * 3 + 1];
      cz += positions[(ringStart + k) * 3 + 2];
    }
    cx /= V; cy /= V; cz /= V;
    const newPositions = new Float32Array(positions.length + 3);
    newPositions.set(positions);
    newPositions[positions.length + 0] = cx;
    newPositions[positions.length + 1] = cy;
    newPositions[positions.length + 2] = cz;
    // normals & colors extend too
    const newNormals = new Float32Array(normalsArr.length + 3);
    newNormals.set(normalsArr);
    // cap normal = average ring normal, or just use tangent direction
    const s = reverse ? M - 1 : 0;
    const T = profile[s].tangent;
    const sign = reverse ? 1 : -1;
    newNormals[normalsArr.length + 0] = T.x * sign;
    newNormals[normalsArr.length + 1] = T.y * sign;
    newNormals[normalsArr.length + 2] = T.z * sign;
    const newColors = new Float32Array(colorsArr.length + 3);
    newColors.set(colorsArr);
    const col = profile[s].color;
    newColors[colorsArr.length + 0] = col.r;
    newColors[colorsArr.length + 1] = col.g;
    newColors[colorsArr.length + 2] = col.b;
    return { centerIdx, newPositions, newNormals, newColors };
  };
  // start cap
  let posFinal = positions;
  let normalFinal = normalsArr;
  let colorFinal = colorsArr;
  {
    const cap = addFanCap(0, false);
    posFinal = cap.newPositions;
    normalFinal = cap.newNormals;
    colorFinal = cap.newColors;
    for (let k = 0; k < V; k++) {
      indices.push(cap.centerIdx, (k + 1) % V, k);
    }
  }
  // end cap
  {
    const ringStart = (M - 1) * V;
    // center vertex at end
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < V; k++) {
      cx += posFinal[(ringStart + k) * 3 + 0];
      cy += posFinal[(ringStart + k) * 3 + 1];
      cz += posFinal[(ringStart + k) * 3 + 2];
    }
    cx /= V; cy /= V; cz /= V;
    const endIdx = posFinal.length / 3;
    const np = new Float32Array(posFinal.length + 3);
    np.set(posFinal);
    np[posFinal.length + 0] = cx;
    np[posFinal.length + 1] = cy;
    np[posFinal.length + 2] = cz;
    const nn = new Float32Array(normalFinal.length + 3);
    nn.set(normalFinal);
    const Tend = profile[M - 1].tangent;
    nn[normalFinal.length + 0] = Tend.x;
    nn[normalFinal.length + 1] = Tend.y;
    nn[normalFinal.length + 2] = Tend.z;
    const nc = new Float32Array(colorFinal.length + 3);
    nc.set(colorFinal);
    const colEnd = profile[M - 1].color;
    nc[colorFinal.length + 0] = colEnd.r;
    nc[colorFinal.length + 1] = colEnd.g;
    nc[colorFinal.length + 2] = colEnd.b;
    posFinal = np;
    normalFinal = nn;
    colorFinal = nc;
    for (let k = 0; k < V; k++) {
      indices.push(endIdx, ringStart + k, ringStart + ((k + 1) % V));
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(posFinal, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(normalFinal, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colorFinal, 3));
  geom.setIndex(indices);
  geom.computeBoundingSphere();
  return geom;
}
