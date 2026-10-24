// Ported from the TEC concept (tec-frontend-work, src/gl/stage.ts), kept in its original style.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Colours in shaders/materials are authored directly in display space.
THREE.ColorManagement.enabled = false;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function webglAvailable(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * A WebGL canvas sized to its container, with half-resolution bloom. Renders
 * only while the container is on screen and the tab is visible.
 */
export abstract class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  protected composer: EffectComposer;
  protected bloom: UnrealBloomPass;
  protected pixelRatio = 1;
  protected width = 1;
  protected height = 1;
  protected readonly still = reducedMotion();
  private timer = new THREE.Timer();
  private onScreen = true;
  private started = false;
  private resizeObserver: ResizeObserver;
  private intersection: IntersectionObserver;
  protected container: HTMLElement;

  constructor(
    container: HTMLElement,
    opts: { fov?: number; bloom?: [strength: number, radius: number, threshold: number] } = {},
  ) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.domElement.className = 'gl-canvas';
    container.prepend(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.05, 600);
    this.scene.add(this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const [strength, radius, threshold] = opts.bloom ?? [0.6, 0.45, 0.55];
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), strength, radius, threshold);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resizeObserver = new ResizeObserver(() => this.started && this.resize());
    this.resizeObserver.observe(container);
    this.intersection = new IntersectionObserver(([entry]) => (this.onScreen = entry.isIntersecting));
    this.intersection.observe(container);
  }

  /** Subclasses call this at the end of their constructor, once their own fields exist. */
  protected start() {
    this.started = true;
    this.resize();
    this.timer.connect(document);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  protected resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize(w, h);
  }

  private tick() {
    if (!this.onScreen || document.hidden) return;
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.update(this.timer.getElapsed(), dt);
    this.composer.render();
    this.afterRender();
  }

  // A hook for subclasses; the base stage has nothing to resize.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onResize(_w: number, _h: number) {}
  protected afterRender() {}
  protected abstract update(time: number, dt: number): void;

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    this.timer.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: THREE.Material) => m.dispose());
      }
    });
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
