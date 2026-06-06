// Post-processing composer factory for the molecular viewer.
//
// We stack:
//   RenderPass         — basic scene render
//   SSAOPass           — screen-space ambient occlusion; gives the depth cue
//                        that makes surfaces and ribbons look solid
//   ShaderPass (FXAA)  — cheap AA so the SSAO doesn't bring back jaggies
//   OutputPass         — tone mapping + sRGB conversion
//
// The factory returns both the composer and a `resize(w, h)` hook the caller
// should wire to the container's ResizeObserver.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

export type PostFx = {
  composer: EffectComposer;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

export function createPostFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
): PostFx {
  const dpr = renderer.getPixelRatio();
  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  composer.setPixelRatio(dpr);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const ssao = new SSAOPass(scene, camera as THREE.PerspectiveCamera, width, height);
  ssao.kernelRadius = 12;
  ssao.minDistance = 0.0008;
  ssao.maxDistance = 0.12;
  // Default output is SSAO-only which looks like a weird AO-map; we want the
  // default mode (OUTPUT.Default) which multiplies AO into the beauty pass.
  (ssao as unknown as { output: number }).output = 0; // SSAOPass.OUTPUT.Default
  composer.addPass(ssao);

  const fxaa = new ShaderPass(FXAAShader);
  fxaa.material.uniforms['resolution'].value.set(1 / (width * dpr), 1 / (height * dpr));
  composer.addPass(fxaa);

  const output = new OutputPass();
  composer.addPass(output);

  const resize = (w: number, h: number) => {
    composer.setSize(w, h);
    ssao.setSize(w, h);
    fxaa.material.uniforms['resolution'].value.set(1 / (w * dpr), 1 / (h * dpr));
  };

  const dispose = () => {
    composer.passes.forEach((p) => {
      const anyPass = p as unknown as { dispose?: () => void };
      anyPass.dispose?.();
    });
  };

  return { composer, resize, dispose };
}
