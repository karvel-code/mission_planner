// Ported from the TEC concept (tec-frontend-work, src/gl/ship.ts), kept in its original style.
import * as THREE from 'three';
import { glowTexture } from './bodies';

export interface ShipSpec {
  capacity: number;
  range: number;
  speedKmh: number;
}

/** Fleet maxima, so a ship's proportions read relative to the rest of the fleet. */
export interface FleetScale {
  capacity: number;
  range: number;
  speedKmh: number;
}

const BLUE = new THREE.Color('#1c7dff');
const EDGE = new THREE.Color('#7cc2f5');
const CELLS = new THREE.Color('#5aa9ff');

/** Additive fresnel "glass" faces, as on the landing page's blueprint satellite. */
export function holoMaterial(color = BLUE, fill = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uFill: { value: fill } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFill;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        gl_FragColor = vec4(uColor * (0.1 + 0.5 * fres) * uFill, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function lineMaterial(color = EDGE, opacity = 0.85) {
  return new THREE.LineBasicMaterial({
    color: color.clone(),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

interface Part {
  obj: THREE.Object3D;
  home: THREE.Vector3;
  offset: THREE.Vector3;
  delay: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A spacecraft built from primitives, nose along +x. Its proportions come from
 * the spec: habitat modules grow with seats, propellant tanks and solar wings
 * with range, and engine count with speed. Parts can fly apart and assemble.
 */
export class Ship {
  readonly group = new THREE.Group();
  private parts: Part[] = [];
  private faces = holoMaterial();
  private wingFaces = holoMaterial(new THREE.Color('#145fd6'));
  private lines = lineMaterial();
  private cellLines = lineMaterial(CELLS, 0.5);
  private flames: THREE.Sprite[] = [];

  constructor(spec: ShipSpec, fleet: FleetScale) {
    const seats = Math.min(1, Math.log2(1 + spec.capacity) / Math.log2(1 + fleet.capacity));
    const reach = Math.min(1, spec.range / fleet.range);
    const pace = Math.min(1, spec.speedKmh / fleet.speedKmh);

    const modules = Math.max(1, Math.round(1 + seats * 4));
    const hullR = 0.26 + seats * 0.14;
    const segLen = 0.46;
    const hullLen = modules * segLen;
    const tail = -hullLen / 2;
    const nose = hullLen / 2;

    // Habitat modules with seam rings and window bands.
    for (let i = 0; i < modules; i++) {
      const seg = new THREE.Group();
      seg.position.x = tail + segLen * (i + 0.5);
      const body = this.mesh(seg, new THREE.CylinderGeometry(hullR, hullR, segLen * 0.94, 32, 1, true), this.faces, 40);
      body.rotation.z = Math.PI / 2;
      const ring = this.mesh(seg, new THREE.TorusGeometry(hullR * 1.02, 0.012, 6, 40), this.faces, 60);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = segLen / 2;
      const band = this.mesh(seg, new THREE.TorusGeometry(hullR * 1.005, 0.03, 4, 40), this.faces, 60);
      band.rotation.y = Math.PI / 2;
      this.part(seg, [0, (i % 2 ? 1 : -1) * 1.2, 0.4], 0.05 + i * 0.05);
    }

    // Nose cone + cockpit.
    const noseGroup = new THREE.Group();
    noseGroup.position.x = nose;
    const cone = this.mesh(noseGroup, new THREE.CylinderGeometry(0.06, hullR, 0.55, 32, 1, true), this.faces, 40);
    cone.rotation.z = -Math.PI / 2;
    cone.position.x = 0.275;
    const tip = this.mesh(noseGroup, new THREE.SphereGeometry(0.06, 16, 8), this.faces, 50);
    tip.position.x = 0.55;
    this.part(noseGroup, [1.6, 0, 0], 0.3);

    // Propellant tanks: pairs either side, more for longer range.
    const tankPairs = Math.max(1, Math.round(1 + reach * 2));
    const tankR = 0.12 + reach * 0.06;
    for (let i = 0; i < tankPairs; i++) {
      for (const side of [-1, 1]) {
        const tank = new THREE.Group();
        const x = tail + 0.2 + i * (tankR * 2.4);
        tank.position.set(x, 0, side * (hullR + tankR + 0.02));
        const shell = this.mesh(tank, new THREE.CapsuleGeometry(tankR, tankR * 1.2, 6, 20), this.faces, 40);
        shell.rotation.z = Math.PI / 2;
        this.part(tank, [0, 0, side * 1.4], 0.15 + i * 0.06);
      }
    }

    // Solar wings on a dorsal mast, reaching out either side past the tanks; span grows with range.
    const span = 0.6 + reach * 1.1;
    const chord = Math.min(hullLen * 0.7, 0.9);
    const mast = new THREE.Group();
    mast.position.y = hullR;
    const pole = this.mesh(mast, new THREE.BoxGeometry(0.05, 0.16, 0.05), this.wingFaces, 25);
    pole.position.y = 0.08;
    this.part(mast, [0, 1.2, 0], 0.1);
    for (const sign of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(0, hullR + 0.16, sign * (0.06 + span / 2));
      const panel = this.mesh(wing, new THREE.BoxGeometry(chord, 0.02, span), this.wingFaces, 25);
      panel.add(cellGrid(chord, span, 5, Math.round(4 + reach * 6), this.cellLines));
      this.part(wing, [0, 0.6, sign * 2.2], 0.12);
    }

    // Engines: count grows with speed.
    const engines = Math.max(1, Math.round(1 + pace * 3));
    const block = new THREE.Group();
    block.position.x = tail;
    const mount = this.mesh(block, new THREE.CylinderGeometry(hullR * 0.95, hullR * 0.95, 0.1, 32), this.faces, 40);
    mount.rotation.z = Math.PI / 2;
    const flame = glowTexture('252,106,24');
    for (let i = 0; i < engines; i++) {
      const a = (i / engines) * Math.PI * 2;
      const off = engines === 1 ? 0 : hullR * 0.5;
      const nozzle = this.mesh(block, new THREE.CylinderGeometry(0.06, 0.11, 0.22, 20, 1, true), this.faces, 40);
      nozzle.rotation.z = -Math.PI / 2;
      nozzle.position.set(-0.16, Math.cos(a) * off, Math.sin(a) * off);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: flame, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }),
      );
      glow.position.set(-0.32, Math.cos(a) * off, Math.sin(a) * off);
      glow.scale.setScalar(0.3);
      block.add(glow);
      this.flames.push(glow);
    }
    this.part(block, [-1.8, 0, 0], 0.2);

    // Comms dish.
    const dish = new THREE.Group();
    dish.position.set(nose - 0.1, 0, -(hullR + 0.02));
    const bowl = this.mesh(dish, new THREE.SphereGeometry(0.16, 20, 6, 0, Math.PI * 2, 0, Math.PI * 0.32), this.faces, 40);
    bowl.rotation.x = -Math.PI / 2;
    this.part(dish, [0.4, 0.4, -1.2], 0.35);

  }

  private mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, threshold = 25) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), this.lines));
    parent.add(mesh);
    return mesh;
  }

  private part(obj: THREE.Object3D, offset: [number, number, number], delay: number) {
    this.group.add(obj);
    this.parts.push({ obj, home: obj.position.clone(), offset: new THREE.Vector3(...offset), delay });
  }

  /** 0 = exploded, 1 = assembled. */
  setAssembly(t: number) {
    for (const p of this.parts) {
      const k = smooth(p.delay, p.delay + 0.55, t);
      p.obj.position.copy(p.home).addScaledVector(p.offset, 1 - k);
    }
    this.lines.opacity = 0.85 * Math.min(1, t * 2);
    this.faces.uniforms.uFill.value = this.wingFaces.uniforms.uFill.value = Math.min(1, t * 1.5);
  }

  /** Engine flicker. */
  update(time: number) {
    this.flames.forEach((f, i) => {
      const s = 0.26 + 0.05 * Math.sin(time * 23 + i * 1.7) + 0.03 * Math.sin(time * 41 + i);
      f.scale.setScalar(s);
    });
  }

  setTint(color: THREE.ColorRepresentation) {
    this.lines.color.set(color);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
    });
    for (const m of [this.faces, this.wingFaces, this.lines, this.cellLines]) m.dispose();
    this.flames.forEach((f) => f.material.dispose());
  }
}

/** Solar-cell grid lines on top of a w (x) by d (z) panel. */
function cellGrid(w: number, d: number, nx: number, nz: number, mat: THREE.LineBasicMaterial) {
  const pts: number[] = [];
  const y = 0.012;
  for (let i = 1; i < nx; i++) {
    const x = -w / 2 + (i / nx) * w;
    pts.push(x, y, -d / 2, x, y, d / 2);
  }
  for (let j = 1; j < nz; j++) {
    const z = -d / 2 + (j / nz) * d;
    pts.push(-w / 2, y, z, w / 2, y, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, mat);
}
