'use client';

// ThreeModeViewer — animated cartoon of a single normal mode.
//
// What it shows:
//   • SS-aware cartoon (same builder as the main MolstarViewer): helices are
//     flat ribbons, β-strands have arrow-tipped ribbons, coils are round tubes.
//   • The cartoon is deformed along the ANM mode. 28 frames are pre-computed
//     once the component mounts and the mesh swaps geometry at 24fps.
//   • Residues are coloured by their mode displacement magnitude ("hot"
//     residues glow gold, "cold" residues sit in sage) so the viewer instantly
//     communicates what the mode is doing.
//   • Thin trace line overlays the current backbone to reinforce direction.
//   • Full post-processing composer (SSAO + FXAA) matching the main viewer.
//
// Frame geometries are built inside the effect (not via useMemo) so that each
// mount owns its own buffers — this is what makes React 18's strict-mode
// double-mount safe. Construction is deferred one rAF so the spinner paints
// before we block the main thread.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { CAAtom } from '@/lib/pdb';
import type { ENMResult } from '@/lib/types';
import { animateAlongMode } from '@/lib/enm';
import { cn } from '@/lib/utils';
import { splitByChain, type ChainSS } from '@/lib/viewer/ss';
import { buildChainCartoon } from '@/lib/viewer/cartoon';
import { createPostFx, type PostFx } from '@/lib/viewer/postfx';

type Props = {
  atoms: CAAtom[];
  mode: ENMResult['modes'][number];
  amplitude?: number;
  frames?: number;
  className?: string;
};

// Hot→cold palette tuned to the rest of the Catalytic Atlas design.
const HOT_COLOR = new THREE.Color(0xe8b86d); // gold — big motion
const MID_COLOR = new THREE.Color(0xd4613a); // terra
const COLD_COLOR = new THREE.Color(0x4e9e8c); // sage — near-stationary

function sampleHotCold(t: number, out: THREE.Color): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) return out.copy(COLD_COLOR).lerp(MID_COLOR, clamped * 2);
  return out.copy(MID_COLOR).lerp(HOT_COLOR, (clamped - 0.5) * 2);
}

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
    preserveDrawingBuffer: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
  };

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', attribs) as WebGL2RenderingContext | null;
  } catch {
    /* noop */
  }
  if (!gl) {
    try {
      gl = canvas.getContext('webgl', attribs) as WebGLRenderingContext | null;
    } catch {
      /* noop */
    }
  }
  if (!gl) {
    try {
      gl = canvas.getContext('experimental-webgl', attribs) as WebGLRenderingContext | null;
    } catch {
      /* noop */
    }
  }
  if (!gl) throw new Error('WebGL is not available.');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b0d13, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(canvas);
  return renderer;
}

// Per-residue displacement magnitude for colour by motion.
function displacementColors(atoms: CAAtom[], mode: ENMResult['modes'][number]): Float32Array {
  const N = atoms.length;
  const mags = new Float32Array(N);
  let maxMag = 0;
  for (let i = 0; i < N; i++) {
    const v = mode.vectors[i];
    const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    mags[i] = m;
    if (m > maxMag) maxMag = m;
  }
  const out = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const t = maxMag > 0 ? mags[i] / maxMag : 0;
    sampleHotCold(t, c);
    out[i * 3 + 0] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  return out;
}

function sliceCaColors(
  chainAtoms: CAAtom[],
  globalIndex: Map<CAAtom, number>,
  caColors: Float32Array,
): Float32Array {
  const out = new Float32Array(chainAtoms.length * 3);
  for (let i = 0; i < chainAtoms.length; i++) {
    const g = globalIndex.get(chainAtoms[i]);
    if (g === undefined) continue;
    out[i * 3 + 0] = caColors[g * 3 + 0];
    out[i * 3 + 1] = caColors[g * 3 + 1];
    out[i * 3 + 2] = caColors[g * 3 + 2];
  }
  return out;
}

type FrameCache = {
  perChain: (THREE.BufferGeometry | null)[][]; // [frameIndex][chainIndex]
  linePositions: Float32Array[];
  lineColors: Float32Array;
};

function buildFrameCache(
  atoms: CAAtom[],
  mode: ENMResult['modes'][number],
  amplitude: number,
  frameCount: number,
): FrameCache {
  const caColors = displacementColors(atoms, mode);
  const chainsRef: ChainSS[] = splitByChain(atoms);
  // Map each ref atom → its index in the global atoms array.
  const globalIndex = new Map<CAAtom, number>();
  atoms.forEach((a, i) => globalIndex.set(a, i));

  const perChain: (THREE.BufferGeometry | null)[][] = [];
  const linePositions: Float32Array[] = [];

  for (let f = 0; f < frameCount; f++) {
    const phase = (2 * Math.PI * f) / frameCount;
    const animated = animateAlongMode(atoms, mode, amplitude, phase);

    const frameChains: (THREE.BufferGeometry | null)[] = [];
    for (const ch of chainsRef) {
      // Rebuild the animated atom list for this chain, preserving order.
      const animChainAtoms: CAAtom[] = [];
      for (const refAtom of ch.atoms) {
        const g = globalIndex.get(refAtom);
        if (g === undefined) continue;
        animChainAtoms.push(animated[g]);
      }
      if (animChainAtoms.length < 2) {
        frameChains.push(null);
        continue;
      }
      const chainColors = sliceCaColors(ch.atoms, globalIndex, caColors);
      let geom: THREE.BufferGeometry | null = null;
      try {
        geom = buildChainCartoon({ atoms: animChainAtoms, ss: ch.ss, caColors: chainColors });
      } catch {
        geom = null;
      }
      frameChains.push(geom);
    }
    perChain.push(frameChains);

    const flat = new Float32Array(animated.length * 3);
    for (let i = 0; i < animated.length; i++) {
      flat[i * 3 + 0] = animated[i].x;
      flat[i * 3 + 1] = animated[i].y;
      flat[i * 3 + 2] = animated[i].z;
    }
    linePositions.push(flat);
  }

  return { perChain, linePositions, lineColors: caColors };
}

export default function ThreeModeViewer({
  atoms,
  mode,
  amplitude = 6,
  frames = 28,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let postfx: PostFx | null = null;
    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let deferId = 0;

    // This effect owns the frame cache. Building it here (rather than in
    // useMemo) means each React mount cycle — including strict-mode's
    // mount→unmount→mount — disposes the exact geometries it built.
    let cache: FrameCache | null = null;
    const chainMeshes: THREE.Mesh[] = [];
    let cartoonMat: THREE.MeshStandardMaterial | null = null;
    let lineGeom: LineGeometry | null = null;
    let lineMat: LineMaterial | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;

    // Build the WebGL scaffolding early so the canvas is visible; defer the
    // heavy frame construction one rAF so the spinner paints first.
    try {
      renderer = createRenderer(container);
    } catch {
      setStatus('error');
      return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d13);
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;
    camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);

    scene.add(new THREE.HemisphereLight(0xd7cbb8, 0x0b0d13, 0.55));
    const key = new THREE.DirectionalLight(0xffe6c2, 1.0);
    key.position.set(5, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x7ba8a3, 0.35);
    fill.position.set(-6, 2, -4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x8b5a9f, 0.22);
    rim.position.set(0, -6, 4);
    scene.add(rim);

    renderer.setSize(width, height, false);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    deferId = requestAnimationFrame(() => {
      if (cancelled || !renderer || !scene || !camera) return;
      try {
        cache = buildFrameCache(atoms, mode, amplitude, frames);
      } catch {
        setStatus('error');
        return;
      }
      if (cancelled) return;

      cartoonMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.12,
        roughness: 0.48,
        flatShading: false,
        side: THREE.DoubleSide,
      });

      const chainCount = cache.perChain[0]?.length ?? 0;
      for (let c = 0; c < chainCount; c++) {
        const initialGeom = cache.perChain[0][c];
        const mesh = new THREE.Mesh(initialGeom ?? new THREE.BufferGeometry(), cartoonMat);
        mesh.visible = !!initialGeom;
        mesh.frustumCulled = false;
        chainMeshes.push(mesh);
        scene.add(mesh);
      }

      lineGeom = new LineGeometry();
      lineGeom.setPositions(Array.from(cache.linePositions[0]));
      lineGeom.setColors(Array.from(cache.lineColors));
      lineMat = new LineMaterial({
        linewidth: 2.2,
        vertexColors: true,
        worldUnits: false,
        dashed: false,
        alphaToCoverage: true,
        transparent: true,
        opacity: 0.75,
      });
      lineMat.resolution.set(width, height);
      const line = new Line2(lineGeom, lineMat);
      line.computeLineDistances();
      line.renderOrder = 2;
      scene.add(line);

      // Fit camera from the first frame's bounding sphere.
      const box = new THREE.Box3().setFromArray(cache.linePositions[0] as unknown as number[]);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const radius = sphere.radius || 30;
      const fitDist = radius / Math.sin((camera.fov * Math.PI) / 360);
      camera.position
        .copy(sphere.center)
        .add(new THREE.Vector3(0.35, 0.25, 1).normalize().multiplyScalar(fitDist * 1.25));
      camera.near = Math.max(0.1, fitDist * 0.01);
      camera.far = fitDist * 20;
      camera.updateProjectionMatrix();
      controls!.target.copy(sphere.center);
      controls!.update();

      try {
        postfx = createPostFx(renderer, scene, camera, width, height);
      } catch {
        postfx = null;
      }

      const fps = 24;
      const frameDurationMs = 1000 / fps;
      let lastFrameTime = performance.now();
      let currentFrame = 0;

      const tick = () => {
        if (cancelled || !renderer || !scene || !camera || !cache) return;
        const now = performance.now();
        if (now - lastFrameTime >= frameDurationMs) {
          lastFrameTime = now;
          currentFrame = (currentFrame + 1) % frames;
          const frameGeoms = cache.perChain[currentFrame];
          for (let c = 0; c < chainMeshes.length; c++) {
            const g = frameGeoms[c];
            if (g) {
              chainMeshes[c].geometry = g;
              chainMeshes[c].visible = true;
            } else {
              chainMeshes[c].visible = false;
            }
          }
          if (lineGeom) lineGeom.setPositions(Array.from(cache.linePositions[currentFrame]));
        }
        controls!.update();
        if (postfx) postfx.composer.render();
        else renderer.render(scene, camera);
        frameId = requestAnimationFrame(tick);
      };

      resizeObserver = new ResizeObserver(() => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth || 600;
        const h = container.clientHeight || 420;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (lineMat) lineMat.resolution.set(w, h);
        if (postfx) postfx.resize(w, h);
      });
      resizeObserver.observe(container);

      setStatus('ready');
      frameId = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      if (deferId) cancelAnimationFrame(deferId);
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      try {
        postfx?.dispose();
      } catch {
        /* noop */
      }
      controls?.dispose();
      if (lineGeom) {
        try {
          lineGeom.dispose();
        } catch {
          /* noop */
        }
      }
      if (lineMat) {
        try {
          lineMat.dispose();
        } catch {
          /* noop */
        }
      }
      if (cartoonMat) {
        try {
          cartoonMat.dispose();
        } catch {
          /* noop */
        }
      }
      // Dispose every geometry we built in THIS mount — no sharing across
      // React strict-mode double-mount cycles.
      if (cache) {
        for (const frame of cache.perChain) {
          for (const g of frame) {
            if (g) {
              try {
                g.dispose();
              } catch {
                /* noop */
              }
            }
          }
        }
      }
      if (renderer) {
        try {
          renderer.dispose();
        } catch {
          /* noop */
        }
        const dom = renderer.domElement;
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      }
    };
  }, [atoms, mode, amplitude, frames]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-stage-700/60 bg-stage-950', className)}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: 420, position: 'relative' }} />
      <div className="pointer-events-none absolute left-3 top-3 rounded border border-stage-700 bg-stage-900/85 px-2 py-1 font-mono text-2xs uppercase tracking-widest text-paper-300 backdrop-blur">
        Mode {mode.index} · λ = {mode.eigenvalue.toExponential(2)} · collectivity {(mode.collectivity * 100).toFixed(1)}%
      </div>
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded border border-stage-700 bg-stage-900/85 px-2 py-1 font-mono text-2xs uppercase tracking-widest text-paper-300 backdrop-blur">
        <span>cold</span>
        <span
          className="inline-block h-2 w-16 rounded"
          style={{ background: 'linear-gradient(90deg, #4e9e8c 0%, #d4613a 50%, #e8b86d 100%)' }}
        />
        <span>hot</span>
      </div>
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-stage-950/80 backdrop-blur-sm">
          <div className="text-center">
            <div
              className={cn(
                'mb-2 inline-block h-8 w-8 rounded-full border-2 border-stage-700 border-t-catalytic-gold',
                status === 'loading' ? 'animate-spin' : '',
              )}
            />
            <div className={cn('font-mono text-xs', status === 'error' ? 'text-catalytic-terra' : 'text-paper-300')}>
              {status === 'error' ? 'Failed to render mode' : 'Building trajectory…'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
