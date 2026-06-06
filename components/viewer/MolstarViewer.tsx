'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cn } from '@/lib/utils';
import { parsePdbCA, fetchPdbText, aaThreeToOne, type CAAtom } from '@/lib/pdb';
import type { CatalyticResidue } from '@/lib/types';
import { splitByChain, type SSCode } from '@/lib/viewer/ss';
import { buildChainCartoon } from '@/lib/viewer/cartoon';
import { buildGaussianSurface, recolorSurface } from '@/lib/viewer/surface';
import { createPostFx, type PostFx } from '@/lib/viewer/postfx';
import { computeCaColors, CATALYTIC_PALETTE, type ViewerColor } from '@/lib/viewer/colors';

// The file keeps its historical name (the codebase still imports from
// ./MolstarViewer) even though Mol* is long gone — this is now a pure
// three.js implementation with a proper post-processing stack, marching-cubes
// surfaces, SS-aware cartoons, and hover/pick interaction.

export type ViewerRepresentation =
  | 'molecular-surface'
  | 'gaussian-surface'
  | 'cartoon'
  | 'cartoon+surface'
  | 'ball-and-stick'
  | 'spacefill';

export type { ViewerColor };

export type ResidueSelection = {
  chain: string;
  resi: number;
  resn?: string;
  atomName?: string;
};

export type MolstarViewerHandle = {
  focusResidue: (chain: string, resi: number) => Promise<void>;
  highlightResidues: (residues: ResidueSelection[], color?: number) => Promise<void>;
  clearHighlights: () => Promise<void>;
  setRepresentation: (rep: ViewerRepresentation) => Promise<void>;
  setColor: (scheme: ViewerColor) => Promise<void>;
  toggleSpin: () => void;
  screenshot: () => Promise<string | null>;
};

export type MolstarViewerProps = {
  pdbId?: string;
  pdbUrl?: string;
  pdbText?: string;
  catalyticResidues?: CatalyticResidue[];
  initialRepresentation?: ViewerRepresentation;
  initialColor?: ViewerColor;
  className?: string;
  onResidueClick?: (selection: ResidueSelection | null) => void;
  onLoad?: () => void;
};

type HoverInfo = {
  x: number;
  y: number;
  chain: string;
  resi: number;
  resn: string;
};

// WebGL renderer constructed with permissive context attribs so it never fails
// on browsers that refuse aggressive defaults.
function createRenderer(container: HTMLDivElement): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const attribs: WebGLContextAttributes = {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
  };

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try { gl = canvas.getContext('webgl2', attribs) as WebGL2RenderingContext | null; } catch { gl = null; }
  if (!gl) { try { gl = canvas.getContext('webgl', attribs) as WebGLRenderingContext | null; } catch { gl = null; } }
  if (!gl) { try { gl = canvas.getContext('experimental-webgl', attribs) as WebGLRenderingContext | null; } catch { gl = null; } }
  if (!gl) throw new Error('WebGL is not available on this browser.');

  const renderer = new THREE.WebGLRenderer({
    canvas, context: gl,
    antialias: true, alpha: false, premultipliedAlpha: true,
    preserveDrawingBuffer: true, powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b0d13, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(canvas);
  return renderer;
}

// Per-residue pick mesh (invisible sphere) so every representation — even pure
// surface — routes clicks back to a residue.
function buildPickOverlay(atoms: CAAtom[]): {
  group: THREE.Group;
  meshes: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const geom = new THREE.SphereGeometry(1.6, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ visible: false, depthWrite: false });
  const meshes: THREE.Mesh[] = [];
  for (const a of atoms) {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(a.x, a.y, a.z);
    m.userData = { chain: a.chain, resi: a.resi, resn: a.resn };
    group.add(m);
    meshes.push(m);
  }
  return { group, meshes };
}

// Simple ball-and-stick built from InstancedMeshes for the spheres and
// cylinders — fast enough for typical enzymes.
function buildBallAndStick(atoms: CAAtom[], caColors: Float32Array): THREE.Group {
  const group = new THREE.Group();
  const sphereGeom = new THREE.SphereGeometry(0.55, 14, 10);
  const sphereMat = new THREE.MeshStandardMaterial({
    vertexColors: false,
    metalness: 0.08,
    roughness: 0.5,
  });
  const spheres = new THREE.InstancedMesh(sphereGeom, sphereMat, atoms.length);
  spheres.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(atoms.length * 3), 3);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < atoms.length; i++) {
    dummy.position.set(atoms[i].x, atoms[i].y, atoms[i].z);
    dummy.updateMatrix();
    spheres.setMatrixAt(i, dummy.matrix);
    col.setRGB(caColors[i * 3], caColors[i * 3 + 1], caColors[i * 3 + 2]);
    spheres.setColorAt(i, col);
  }
  spheres.instanceMatrix.needsUpdate = true;
  if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true;
  group.add(spheres);

  // Count valid bonds (same chain, consecutive residue index)
  const bonds: [number, number][] = [];
  for (let i = 0; i < atoms.length - 1; i++) {
    if (atoms[i].chain === atoms[i + 1].chain) bonds.push([i, i + 1]);
  }
  if (bonds.length) {
    const cylGeom = new THREE.CylinderGeometry(0.16, 0.16, 1, 10);
    const cylMat = new THREE.MeshStandardMaterial({
      vertexColors: false,
      metalness: 0.08,
      roughness: 0.55,
    });
    const cyls = new THREE.InstancedMesh(cylGeom, cylMat, bonds.length);
    cyls.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(bonds.length * 3), 3);
    const up = new THREE.Vector3(0, 1, 0);
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    bonds.forEach(([i, j], k) => {
      tmpA.set(atoms[i].x, atoms[i].y, atoms[i].z);
      tmpB.set(atoms[j].x, atoms[j].y, atoms[j].z);
      tmpDir.subVectors(tmpB, tmpA);
      const len = tmpDir.length();
      tmpDir.normalize();
      quat.setFromUnitVectors(up, tmpDir);
      dummy.position.copy(tmpA).addScaledVector(tmpDir, len / 2);
      dummy.quaternion.copy(quat);
      dummy.scale.set(1, len, 1);
      dummy.updateMatrix();
      cyls.setMatrixAt(k, dummy.matrix);
      col.setRGB(
        (caColors[i * 3] + caColors[j * 3]) / 2,
        (caColors[i * 3 + 1] + caColors[j * 3 + 1]) / 2,
        (caColors[i * 3 + 2] + caColors[j * 3 + 2]) / 2,
      );
      cyls.setColorAt(k, col);
    });
    cyls.instanceMatrix.needsUpdate = true;
    if (cyls.instanceColor) cyls.instanceColor.needsUpdate = true;
    group.add(cyls);
  }

  return group;
}

function buildSpacefill(atoms: CAAtom[], caColors: Float32Array): THREE.Group {
  const group = new THREE.Group();
  const geom = new THREE.SphereGeometry(2.5, 20, 14);
  const mat = new THREE.MeshStandardMaterial({ metalness: 0.08, roughness: 0.5 });
  const inst = new THREE.InstancedMesh(geom, mat, atoms.length);
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(atoms.length * 3), 3);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < atoms.length; i++) {
    dummy.position.set(atoms[i].x, atoms[i].y, atoms[i].z);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    col.setRGB(caColors[i * 3], caColors[i * 3 + 1], caColors[i * 3 + 2]);
    inst.setColorAt(i, col);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);
  return group;
}

function fitCameraTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius || 30;
  const fitDist = radius / Math.sin((camera.fov * Math.PI) / 360);
  const dir = new THREE.Vector3(0.35, 0.25, 1).normalize();
  camera.position.copy(sphere.center).addScaledVector(dir, fitDist * 1.15);
  camera.near = Math.max(0.1, fitDist * 0.01);
  camera.far = fitDist * 20;
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  controls.minDistance = radius * 0.25;
  controls.maxDistance = fitDist * 6;
  controls.update();
}

const MolstarViewer = forwardRef<MolstarViewerHandle, MolstarViewerProps>(function MolstarViewer(
  {
    pdbId,
    pdbUrl,
    pdbText,
    catalyticResidues,
    initialRepresentation = 'cartoon+surface',
    initialColor = 'chain-id',
    className,
    onResidueClick,
    onLoad,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const postfxRef = useRef<PostFx | null>(null);
  const atomsRef = useRef<CAAtom[]>([]);
  const ssRef = useRef<SSCode[]>([]); // per-atom SS, aligned with atomsRef
  const rootRef = useRef<THREE.Group | null>(null);

  const cartoonGroupRef = useRef<THREE.Group | null>(null);
  const surfaceMeshRef = useRef<THREE.Mesh | null>(null);
  const surfaceV2ARef = useRef<Int32Array | null>(null);
  const bondsGroupRef = useRef<THREE.Group | null>(null);
  const spacefillGroupRef = useRef<THREE.Group | null>(null);
  const pickGroupRef = useRef<THREE.Group | null>(null);
  const pickMeshesRef = useRef<THREE.Mesh[]>([]);
  const catalyticGroupRef = useRef<THREE.Object3D | null>(null);
  const highlightGroupRef = useRef<THREE.Group | null>(null);

  const representationRef = useRef<ViewerRepresentation>(initialRepresentation);
  const colorRef = useRef<ViewerColor>(initialColor);
  const caColorsRef = useRef<Float32Array | null>(null);
  const spinningRef = useRef(false);
  const frameIdRef = useRef(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const onResidueClickRef = useRef(onResidueClick);
  onResidueClickRef.current = onResidueClick;
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const initialCatalyticRef = useRef(catalyticResidues);
  initialCatalyticRef.current = initialCatalyticRef.current ?? catalyticResidues;

  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const source = useMemo(() => ({ pdbId, pdbUrl, pdbText }), [pdbId, pdbUrl, pdbText]);
  const catalyticKey = useMemo(
    () => (catalyticResidues ?? []).map((r) => `${r.chain}:${r.resi}`).join(','),
    [catalyticResidues],
  );

  // Dispose everything inside a group safely.
  const disposeGroup = (g: THREE.Object3D | null) => {
    if (!g) return;
    g.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose?.();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose?.();
    });
  };

  const rebuildCartoon = useCallback(() => {
    const root = rootRef.current;
    const atoms = atomsRef.current;
    const caColors = caColorsRef.current;
    if (!root || !atoms.length || !caColors) return;

    if (cartoonGroupRef.current) {
      root.remove(cartoonGroupRef.current);
      disposeGroup(cartoonGroupRef.current);
      cartoonGroupRef.current = null;
    }

    const group = new THREE.Group();
    const chains = splitByChain(atoms);
    // align caColors index — need a global atom index per chain
    const atomIndex = new Map<string, number>();
    atoms.forEach((a, i) => atomIndex.set(`${a.chain}:${a.resi}`, i));

    for (const chain of chains) {
      // Per-chain colour slice: map chain.atoms → global caColors
      const chainColors = new Float32Array(chain.atoms.length * 3);
      chain.atoms.forEach((a, i) => {
        const gi = atomIndex.get(`${a.chain}:${a.resi}`);
        if (gi == null) return;
        chainColors[i * 3 + 0] = caColors[gi * 3 + 0];
        chainColors[i * 3 + 1] = caColors[gi * 3 + 1];
        chainColors[i * 3 + 2] = caColors[gi * 3 + 2];
      });
      const geom = buildChainCartoon({
        atoms: chain.atoms,
        ss: chain.ss,
        caColors: chainColors,
      });
      if (!geom) continue;
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.08,
        roughness: 0.45,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      group.add(mesh);
    }
    cartoonGroupRef.current = group;
    root.add(group);
  }, []);

  const rebuildSurface = useCallback(() => {
    const root = rootRef.current;
    const atoms = atomsRef.current;
    const caColors = caColorsRef.current;
    if (!root || !atoms.length || !caColors) return;

    if (surfaceMeshRef.current) {
      root.remove(surfaceMeshRef.current);
      disposeGroup(surfaceMeshRef.current);
      surfaceMeshRef.current = null;
      surfaceV2ARef.current = null;
    }
    const built = buildGaussianSurface(atoms, caColors);
    if (!built) return;

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.05,
      roughness: 0.55,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(built.geometry, mat);
    mesh.renderOrder = 2; // draw after opaque
    surfaceMeshRef.current = mesh;
    surfaceV2ARef.current = built.vertexToAtom;
    root.add(mesh);
  }, []);

  const rebuildBallAndStick = useCallback(() => {
    const root = rootRef.current;
    const atoms = atomsRef.current;
    const caColors = caColorsRef.current;
    if (!root || !atoms.length || !caColors) return;
    if (bondsGroupRef.current) {
      root.remove(bondsGroupRef.current);
      disposeGroup(bondsGroupRef.current);
      bondsGroupRef.current = null;
    }
    const g = buildBallAndStick(atoms, caColors);
    bondsGroupRef.current = g;
    root.add(g);
  }, []);

  const rebuildSpacefill = useCallback(() => {
    const root = rootRef.current;
    const atoms = atomsRef.current;
    const caColors = caColorsRef.current;
    if (!root || !atoms.length || !caColors) return;
    if (spacefillGroupRef.current) {
      root.remove(spacefillGroupRef.current);
      disposeGroup(spacefillGroupRef.current);
      spacefillGroupRef.current = null;
    }
    const g = buildSpacefill(atoms, caColors);
    spacefillGroupRef.current = g;
    root.add(g);
  }, []);

  const clearAllRepresentations = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const refHolder of [cartoonGroupRef, surfaceMeshRef, bondsGroupRef, spacefillGroupRef] as const) {
      const obj = refHolder.current as THREE.Object3D | null;
      if (obj) {
        root.remove(obj);
        disposeGroup(obj);
      }
      refHolder.current = null;
    }
    surfaceV2ARef.current = null;
  }, []);

  const applyRepresentation = useCallback(() => {
    const rep = representationRef.current;
    clearAllRepresentations();
    switch (rep) {
      case 'cartoon':
        rebuildCartoon();
        break;
      case 'cartoon+surface':
        rebuildCartoon();
        rebuildSurface();
        break;
      case 'molecular-surface':
      case 'gaussian-surface':
        rebuildSurface();
        break;
      case 'ball-and-stick':
        rebuildBallAndStick();
        break;
      case 'spacefill':
        rebuildSpacefill();
        break;
      default:
        rebuildCartoon();
    }
  }, [clearAllRepresentations, rebuildCartoon, rebuildSurface, rebuildBallAndStick, rebuildSpacefill]);

  const recomputeColors = useCallback(() => {
    const atoms = atomsRef.current;
    if (!atoms.length) return;
    caColorsRef.current = computeCaColors(atoms, ssRef.current, colorRef.current);
  }, []);

  const rebuildCatalytic = useCallback((residues: CatalyticResidue[] | undefined) => {
    const root = rootRef.current;
    if (!root) return;
    if (catalyticGroupRef.current) {
      root.remove(catalyticGroupRef.current);
      disposeGroup(catalyticGroupRef.current);
      catalyticGroupRef.current = null;
    }
    if (!residues?.length) return;
    const group = new THREE.Group();
    const geom = new THREE.SphereGeometry(1.75, 26, 18);
    const byKey = new Map<string, CAAtom>();
    for (const a of atomsRef.current) byKey.set(`${a.chain}:${a.resi}`, a);
    residues.forEach((r, i) => {
      const a = byKey.get(`${r.chain}:${r.resi}`);
      if (!a) return;
      const hex = CATALYTIC_PALETTE[i % CATALYTIC_PALETTE.length];
      const mat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.55,
        metalness: 0.25,
        roughness: 0.25,
      });
      const m = new THREE.Mesh(geom, mat);
      m.position.set(a.x, a.y, a.z);
      // soft glow halo behind it
      const haloGeom = new THREE.SphereGeometry(2.6, 20, 14);
      const haloMat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      halo.position.copy(m.position);
      halo.renderOrder = 3;
      group.add(halo);
      group.add(m);
    });
    catalyticGroupRef.current = group;
    root.add(group);
  }, []);

  // Imperative API -----------------------------------------------------------
  const setRepresentation = useCallback(async (rep: ViewerRepresentation) => {
    representationRef.current = rep;
    applyRepresentation();
  }, [applyRepresentation]);

  const setColor = useCallback(async (scheme: ViewerColor) => {
    colorRef.current = scheme;
    recomputeColors();
    // If only the colour changed, recolour surfaces in-place (cheap) and
    // rebuild the colour-bearing sub-meshes.
    if (surfaceMeshRef.current && surfaceV2ARef.current && caColorsRef.current) {
      recolorSurface(surfaceMeshRef.current.geometry as THREE.BufferGeometry, surfaceV2ARef.current, caColorsRef.current);
    }
    // Cartoon and ball-and-stick bake colours into geometry so we rebuild them.
    if (cartoonGroupRef.current) rebuildCartoon();
    if (bondsGroupRef.current) rebuildBallAndStick();
    if (spacefillGroupRef.current) rebuildSpacefill();
  }, [recomputeColors, rebuildCartoon, rebuildBallAndStick, rebuildSpacefill]);

  const highlightResidues = useCallback(async (residues: ResidueSelection[], color?: number) => {
    const root = rootRef.current;
    if (!root) return;
    if (highlightGroupRef.current) {
      root.remove(highlightGroupRef.current);
      disposeGroup(highlightGroupRef.current);
      highlightGroupRef.current = null;
    }
    if (!residues?.length) return;
    const group = new THREE.Group();
    const geom = new THREE.SphereGeometry(2.2, 26, 18);
    const byKey = new Map<string, CAAtom>();
    for (const a of atomsRef.current) byKey.set(`${a.chain}:${a.resi}`, a);
    residues.forEach((r, i) => {
      const a = byKey.get(`${r.chain}:${r.resi}`);
      if (!a) return;
      const hex = color ?? CATALYTIC_PALETTE[i % CATALYTIC_PALETTE.length];
      const mat = new THREE.MeshStandardMaterial({
        color: hex, emissive: hex, emissiveIntensity: 0.9, metalness: 0.25, roughness: 0.2,
      });
      const m = new THREE.Mesh(geom, mat);
      m.position.set(a.x, a.y, a.z);
      group.add(m);
    });
    highlightGroupRef.current = group;
    root.add(group);
  }, []);

  const clearHighlights = useCallback(async () => {
    const root = rootRef.current;
    if (!root || !highlightGroupRef.current) return;
    root.remove(highlightGroupRef.current);
    disposeGroup(highlightGroupRef.current);
    highlightGroupRef.current = null;
  }, []);

  const focusResidue = useCallback(async (chain: string, resi: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const target = atomsRef.current.find((a) => a.chain === chain && a.resi === resi);
    if (!target) return;
    const dest = new THREE.Vector3(target.x, target.y, target.z);
    const startTarget = controls.target.clone();
    const startCamPos = camera.position.clone();
    const radius = 22;
    const offsetDir = startCamPos.clone().sub(startTarget).normalize();
    const destCamPos = dest.clone().addScaledVector(offsetDir, radius);
    const duration = 450;
    const t0 = performance.now();
    const tick = () => {
      const now = performance.now();
      const p = Math.min(1, (now - t0) / duration);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      controls.target.lerpVectors(startTarget, dest, e);
      camera.position.lerpVectors(startCamPos, destCamPos, e);
      controls.update();
      if (p < 1) requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const toggleSpin = useCallback(() => {
    spinningRef.current = !spinningRef.current;
  }, []);

  const screenshot = useCallback(async () => {
    const renderer = rendererRef.current;
    if (!renderer) return null;
    try {
      // Render one frame with the composer so SSAO/AA are baked in before
      // we grab the pixels.
      postfxRef.current?.composer.render();
      return renderer.domElement.toDataURL('image/png');
    } catch {
      return null;
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusResidue,
      highlightResidues,
      clearHighlights,
      setRepresentation,
      setColor,
      toggleSpin,
      screenshot,
    }),
    [focusResidue, highlightResidues, clearHighlights, setRepresentation, setColor, toggleSpin, screenshot],
  );

  // Init / teardown, keyed solely on the structure source so parent re-renders
  // don't tear the scene apart.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        setStatus('loading');

        let text = source.pdbText;
        if (!text) {
          if (source.pdbId && !source.pdbUrl) {
            text = await fetchPdbText(source.pdbId);
          } else if (source.pdbUrl) {
            const resp = await fetch(source.pdbUrl);
            if (!resp.ok) return;
            text = await resp.text();
          } else {
            return;
          }
        }
        if (cancelled || !text) return;

        const atoms = parsePdbCA(text);
        if (atoms.length < 2) return;
        atomsRef.current = atoms;

        // Compute per-atom SS once and stash it (aligned with atomsRef).
        const chainSS = splitByChain(atoms);
        const ssByKey = new Map<string, SSCode>();
        for (const ch of chainSS) {
          ch.atoms.forEach((a, i) => ssByKey.set(`${a.chain}:${a.resi}`, ch.ss[i]));
        }
        ssRef.current = atoms.map((a) => ssByKey.get(`${a.chain}:${a.resi}`) ?? 'C');
        recomputeColors();

        let renderer: THREE.WebGLRenderer;
        try {
          renderer = createRenderer(container);
        } catch {
          return;
        }
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b0d13);
        scene.fog = new THREE.Fog(0x0b0d13, 120, 900);
        sceneRef.current = scene;

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 420;
        const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1200);
        cameraRef.current = camera;

        scene.add(new THREE.HemisphereLight(0xd7cbb8, 0x0b0d13, 0.6));
        const key = new THREE.DirectionalLight(0xffe6c2, 1.15);
        key.position.set(5, 8, 6);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x7ba8a3, 0.4);
        fill.position.set(-6, 2, -4);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xe8b86d, 0.35);
        rim.position.set(0, -5, -8);
        scene.add(rim);

        const root = new THREE.Group();
        rootRef.current = root;
        scene.add(root);

        // Build the current representation.
        applyRepresentation();
        rebuildCatalytic(initialCatalyticRef.current);

        // Invisible pick overlay for raycasting.
        const pick = buildPickOverlay(atoms);
        pickGroupRef.current = pick.group;
        pickMeshesRef.current = pick.meshes;
        root.add(pick.group);

        renderer.setSize(width, height, false);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.7;
        controls.zoomSpeed = 0.9;
        controls.panSpeed = 0.6;
        controlsRef.current = controls;
        fitCameraTo(camera, controls, root);

        // Post-processing composer.
        try {
          postfxRef.current = createPostFx(renderer, scene, camera, width, height);
        } catch {
          postfxRef.current = null;
        }

        // Pointer handlers: click = select, move = hover label.
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        let pressed = false;
        let pressX = 0;
        let pressY = 0;
        const onPointerDown = (e: PointerEvent) => {
          pressed = true; pressX = e.clientX; pressY = e.clientY;
        };
        const onPointerUp = (e: PointerEvent) => {
          if (!pressed) return;
          pressed = false;
          const dx = e.clientX - pressX;
          const dy = e.clientY - pressY;
          if (Math.hypot(dx, dy) > 4) return; // ignore drags
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(ndc, camera);
          const picks = pickMeshesRef.current;
          if (!picks.length) return;
          const hits = raycaster.intersectObjects(picks, false);
          if (!hits.length) {
            onResidueClickRef.current?.(null);
            return;
          }
          const ud = hits[0].object.userData as { chain: string; resi: number; resn: string };
          onResidueClickRef.current?.({ chain: ud.chain, resi: ud.resi, resn: ud.resn });
        };
        let hoverRaf = 0;
        const onPointerMove = (e: PointerEvent) => {
          if (hoverRaf) return;
          const clientX = e.clientX;
          const clientY = e.clientY;
          hoverRaf = requestAnimationFrame(() => {
            hoverRaf = 0;
            const rect = renderer.domElement.getBoundingClientRect();
            ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(ndc, camera);
            const picks = pickMeshesRef.current;
            if (!picks.length) {
              setHover(null);
              return;
            }
            const hits = raycaster.intersectObjects(picks, false);
            if (!hits.length) {
              setHover(null);
              return;
            }
            const ud = hits[0].object.userData as { chain: string; resi: number; resn: string };
            setHover({
              x: clientX - rect.left,
              y: clientY - rect.top,
              chain: ud.chain,
              resi: ud.resi,
              resn: ud.resn,
            });
          });
        };
        const onPointerLeave = () => setHover(null);
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerleave', onPointerLeave);

        let lastTime = performance.now();
        const tick = () => {
          if (cancelled) return;
          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          lastTime = now;
          if (spinningRef.current) root.rotation.y += dt * 0.22;
          controls.update();
          if (postfxRef.current) {
            postfxRef.current.composer.render();
          } else {
            renderer.render(scene, camera);
          }
          frameIdRef.current = requestAnimationFrame(tick);
        };

        const ro = new ResizeObserver(() => {
          const w = container.clientWidth || 600;
          const h = container.clientHeight || 420;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          postfxRef.current?.resize(w, h);
        });
        ro.observe(container);
        resizeObserverRef.current = ro;

        if (cancelled) return;
        setStatus('ready');
        onLoadRef.current?.();
        frameIdRef.current = requestAnimationFrame(tick);

        (renderer.domElement as unknown as { __catalyticCleanup?: () => void }).__catalyticCleanup = () => {
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
          if (hoverRaf) cancelAnimationFrame(hoverRaf);
        };
      } catch (err) {
        console.error('[MolstarViewer] init failed', err);
      }
    })();

    return () => {
      cancelled = true;
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      controlsRef.current?.dispose();
      controlsRef.current = null;
      postfxRef.current?.dispose();
      postfxRef.current = null;
      const renderer = rendererRef.current;
      if (renderer) {
        (renderer.domElement as unknown as { __catalyticCleanup?: () => void }).__catalyticCleanup?.();
        renderer.dispose();
        const dom = renderer.domElement;
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      }
      if (sceneRef.current) disposeGroup(sceneRef.current);
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rootRef.current = null;
      cartoonGroupRef.current = null;
      surfaceMeshRef.current = null;
      surfaceV2ARef.current = null;
      bondsGroupRef.current = null;
      spacefillGroupRef.current = null;
      pickGroupRef.current = null;
      catalyticGroupRef.current = null;
      highlightGroupRef.current = null;
      pickMeshesRef.current = [];
      atomsRef.current = [];
      ssRef.current = [];
      caColorsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Catalytic residue set change — refresh without rebuilding the scene.
  useEffect(() => {
    rebuildCatalytic(catalyticResidues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalyticKey]);

  return (
    <div className={cn('relative overflow-hidden bg-stage-950', className)}>
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ position: 'relative', minHeight: 420 }}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded border border-stage-700 bg-stage-900/95 px-2 py-1 font-mono text-2xs uppercase tracking-widest text-paper-100 shadow-lift backdrop-blur"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.resn}
          {hover.resi}
          <span className="ml-1 text-paper-400">
            {aaThreeToOne(hover.resn)} · {hover.chain}
          </span>
        </div>
      )}
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stage-950/80 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-stage-700 border-t-catalytic-gold" />
        </div>
      )}
    </div>
  );
});

export default MolstarViewer;
