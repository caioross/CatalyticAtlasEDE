'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parsePdbCA, fetchPdbText, type CAAtom } from '@/lib/pdb';
import { cn } from '@/lib/utils';
import type { CatalyticResidue } from '@/lib/types';

export type ThreeViewerProps = {
  pdbId?: string;
  pdbUrl?: string;
  pdbText?: string;
  catalyticResidues?: CatalyticResidue[];
  className?: string;
  onLoad?: () => void;
};

// Editorial warm gradient: terra (N-term) → sand (mid) → gold (C-term).
const GRADIENT: [number, THREE.Color][] = [
  [0.0, new THREE.Color(0xd4613a)],
  [0.5, new THREE.Color(0xc4a775)],
  [1.0, new THREE.Color(0xe8b86d)],
];

function sampleGradient(t: number, out: THREE.Color): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < GRADIENT.length - 1; i++) {
    const [t0, c0] = GRADIENT[i];
    const [t1, c1] = GRADIENT[i + 1];
    if (clamped <= t1) {
      const local = (clamped - t0) / (t1 - t0 || 1);
      return out.copy(c0).lerp(c1, local);
    }
  }
  return out.copy(GRADIENT[GRADIENT.length - 1][1]);
}

function groupByChain(atoms: CAAtom[]): Map<string, CAAtom[]> {
  const map = new Map<string, CAAtom[]>();
  for (const a of atoms) {
    if (!map.has(a.chain)) map.set(a.chain, []);
    map.get(a.chain)!.push(a);
  }
  for (const list of map.values()) list.sort((a, b) => a.resi - b.resi);
  return map;
}

// Quick, silent WebGL probe. Returns true if any WebGL context can be created.
let _webglProbeCache: boolean | null = null;
function hasWebGLSupport(): boolean {
  if (_webglProbeCache !== null) return _webglProbeCache;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const attribs: WebGLContextAttributes = {
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'default',
      antialias: false,
      depth: true,
      alpha: false,
    };
    const gl =
      (canvas.getContext('webgl2', attribs) as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', attribs) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl', attribs) as WebGLRenderingContext | null);
    _webglProbeCache = !!gl;
    try {
      (gl as any)?.getExtension?.('WEBGL_lose_context')?.loseContext?.();
    } catch {
      /* noop */
    }
    return _webglProbeCache;
  } catch {
    _webglProbeCache = false;
    return false;
  }
}

// Try to create a WebGL renderer with maximally permissive attribs.
// Three.js's WebGLRenderer wraps canvas.getContext('webgl2'|'webgl') internally;
// we pass in our own canvas + context so we control the attribs and try WebGL1 if
// WebGL2 fails. This is the key to working on machines where Mol*'s high-perf
// context request was rejected.
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
    gl = null;
  }
  if (!gl) {
    try {
      gl = canvas.getContext('webgl', attribs) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
  }
  if (!gl) {
    try {
      gl = canvas.getContext('experimental-webgl', attribs) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
  }
  if (!gl) throw new Error('WebGL is not available on this browser.');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: true,
    alpha: false,
    premultipliedAlpha: true,
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

function buildRibbon(atoms: CAAtom[]): THREE.Object3D | null {
  if (atoms.length < 4) return null;
  const points = atoms.map((a) => new THREE.Vector3(a.x, a.y, a.z));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const tubularSegments = Math.min(2048, Math.max(points.length * 6, 64));
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, 0.7, 12, false);

  // per-vertex colour along the sequence progress
  const pos = geometry.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // Tube vertices are laid out ring-by-ring; progress = floor(i/(radial+1)) / tubularSegments
    const ring = Math.floor(i / 13); // radialSegments+1 = 13
    const t = ring / tubularSegments;
    sampleGradient(t, c);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.05,
    roughness: 0.55,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function buildCatalyticSpheres(atoms: CAAtom[], residues: CatalyticResidue[]): THREE.Object3D {
  const group = new THREE.Group();
  const geom = new THREE.SphereGeometry(1.6, 24, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe8b86d,
    emissive: 0xe8b86d,
    emissiveIntensity: 0.35,
    metalness: 0.2,
    roughness: 0.35,
  });
  const byKey = new Map<string, CAAtom>();
  for (const a of atoms) byKey.set(`${a.chain}:${a.resi}`, a);
  for (const r of residues) {
    const a = byKey.get(`${r.chain}:${r.resi}`);
    if (!a) continue;
    const m = new THREE.Mesh(geom, mat);
    m.position.set(a.x, a.y, a.z);
    group.add(m);
  }
  return group;
}

function centerAndFit(camera: THREE.PerspectiveCamera, controls: OrbitControls, object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const radius = sphere.radius || 30;
  const fitDist = radius / Math.sin((camera.fov * Math.PI) / 360);
  const dir = new THREE.Vector3(0.35, 0.25, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, fitDist * 1.15);
  camera.near = Math.max(0.1, fitDist * 0.01);
  camera.far = fitDist * 20;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = radius * 0.25;
  controls.maxDistance = fitDist * 6;
  controls.update();
}

export default function ThreeViewer({
  pdbId,
  pdbUrl,
  pdbText,
  catalyticResidues,
  className,
  onLoad,
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgl'>('loading');
  const [statusMessage, setStatusMessage] = useState('Loading structure…');

  const source = useMemo(() => ({ pdbId, pdbUrl, pdbText }), [pdbId, pdbUrl, pdbText]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      // Pre-flight: if there's no WebGL at all, don't try to construct a
      // WebGLRenderer — it will throw and light up the Next.js error overlay.
      // Show a polite, explanatory fallback instead.
      if (!hasWebGLSupport()) {
        if (!cancelled) {
          setStatus('no-webgl');
          setStatusMessage(
            'This browser can\'t create a WebGL context. Enable hardware acceleration in your browser settings and reload.',
          );
        }
        return;
      }

      try {
        setStatus('loading');
        setStatusMessage('Fetching structure…');

        let text = source.pdbText;
        if (!text) {
          const url =
            source.pdbUrl ??
            (source.pdbId ? `https://files.rcsb.org/download/${source.pdbId.toLowerCase()}.pdb` : null);
          if (!url) throw new Error('No structure source provided.');
          if (source.pdbId && !source.pdbUrl) {
            text = await fetchPdbText(source.pdbId);
          } else {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to load ${url}`);
            text = await resp.text();
          }
        }
        if (cancelled || !text) return;

        setStatusMessage('Parsing backbone…');
        const atoms = parsePdbCA(text);
        if (atoms.length < 2) throw new Error('No Cα atoms found.');

        setStatusMessage('Rendering ribbon…');
        renderer = createRenderer(container);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b0d13);
        scene.fog = new THREE.Fog(0x0b0d13, 120, 600);

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 420;
        const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);

        const hemi = new THREE.HemisphereLight(0xd7cbb8, 0x0b0d13, 0.55);
        scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffe6c2, 1.1);
        key.position.set(5, 8, 6);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x7ba8a3, 0.35);
        fill.position.set(-6, 2, -4);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xe8b86d, 0.25);
        rim.position.set(0, -5, -8);
        scene.add(rim);

        const root = new THREE.Group();
        const chains = groupByChain(atoms);
        for (const chainAtoms of chains.values()) {
          const ribbon = buildRibbon(chainAtoms);
          if (ribbon) root.add(ribbon);
        }
        if (catalyticResidues?.length) {
          root.add(buildCatalyticSpheres(atoms, catalyticResidues));
        }
        scene.add(root);

        renderer.setSize(width, height, false);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.7;
        controls.zoomSpeed = 0.9;
        controls.panSpeed = 0.6;
        centerAndFit(camera, controls, root);

        // subtle auto-rotation so the molecule is always in gentle motion
        let lastTime = performance.now();
        const tick = () => {
          if (cancelled) return;
          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          lastTime = now;
          root.rotation.y += dt * 0.06;
          controls!.update();
          renderer!.render(scene, camera);
          frameId = requestAnimationFrame(tick);
        };

        resizeObserver = new ResizeObserver(() => {
          if (!container || !renderer) return;
          const w = container.clientWidth || 600;
          const h = container.clientHeight || 420;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        });
        resizeObserver.observe(container);

        if (cancelled) return;
        setStatus('ready');
        setStatusMessage('');
        onLoad?.();
        frameId = requestAnimationFrame(tick);
      } catch (err: any) {
        if (!cancelled) {
          const msg = (err?.message ?? '').toLowerCase();
          if (
            msg.includes('webgl') ||
            msg.includes('gl context') ||
            msg.includes('rendering context') ||
            msg.includes('getcontext')
          ) {
            // Expected on machines without WebGL — treat as a clean fallback,
            // not as a red-overlay error.
            console.warn('[ThreeViewer] WebGL unavailable:', err?.message ?? err);
            setStatus('no-webgl');
            setStatusMessage(
              'This browser can\'t create a WebGL context. Enable hardware acceleration in your browser settings and reload.',
            );
          } else {
            console.error('[ThreeViewer]', err);
            setStatus('error');
            setStatusMessage(err?.message ?? 'Viewer failed.');
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      controls?.dispose();
      if (renderer) {
        renderer.dispose();
        const dom = renderer.domElement;
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      }
    };
  }, [source, catalyticResidues, onLoad]);

  return (
    <div className={cn('relative overflow-hidden bg-stage-950', className)}>
      <div ref={containerRef} className="h-full w-full" style={{ position: 'relative', minHeight: 420 }} />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-stage-950/90 backdrop-blur-sm">
          <div className="max-w-sm px-6 text-center">
            {status === 'loading' && (
              <div className="mb-3 inline-block h-10 w-10 animate-spin rounded-full border-2 border-stage-700 border-t-catalytic-gold" />
            )}
            {status === 'error' && (
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-catalytic-terra/60 bg-catalytic-terra/10 font-display text-lg text-catalytic-terra">
                !
              </div>
            )}
            {status === 'no-webgl' && (
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-catalytic-gold/60 bg-catalytic-gold/10 font-display text-lg text-catalytic-gold">
                i
              </div>
            )}
            {status === 'error' && (
              <div className="mb-2 font-display text-lg text-paper-50">Viewer unavailable</div>
            )}
            {status === 'no-webgl' && (
              <div className="mb-2 font-display text-lg text-paper-50">3D viewer needs WebGL</div>
            )}
            <div
              className={cn(
                'font-mono leading-relaxed tracking-wide',
                status === 'error' ? 'text-xs text-paper-200' : 'text-xs text-paper-300',
              )}
            >
              {statusMessage}
            </div>
            {status === 'no-webgl' && (
              <div className="mt-3 font-mono text-[10px] leading-relaxed text-paper-400">
                Chrome: <span className="text-paper-200">Settings → System → Use hardware acceleration</span>. Firefox:{' '}
                <span className="text-paper-200">about:config → webgl.force-enabled</span>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
