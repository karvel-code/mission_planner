// Ported from the TEC concept (tec-frontend-work, src/gl/bodies.ts), kept in its original style.
import * as THREE from 'three';
import { noiseGLSL } from './noise';

type Kind = 'rocky' | 'gas' | 'ice' | 'earth';

interface Look {
  kind: Kind;
  a: string;
  b: string;
  atmosphere?: string;
  ring?: boolean;
}

/** Procedural looks for the known planets; unknown ids (from a new catalog) get a neutral rocky look. */
const LOOKS: Record<string, Look> = {
  mercury: { kind: 'rocky', a: '#5f5a55', b: '#b9b0a4' },
  venus: { kind: 'gas', a: '#c48f45', b: '#f1d7a0', atmosphere: '#f0b866' },
  earth: { kind: 'earth', a: '#0a2a55', b: '#2f6b2a', atmosphere: '#2f8bff' },
  mars: { kind: 'rocky', a: '#7a2e17', b: '#e0884f', atmosphere: '#ff8a5c' },
  jupiter: { kind: 'gas', a: '#9c6a43', b: '#f2e2c6', atmosphere: '#f0c9a0' },
  saturn: { kind: 'gas', a: '#b3925a', b: '#f3e4bc', atmosphere: '#f2dca6', ring: true },
  uranus: { kind: 'ice', a: '#5fbfcc', b: '#c4f1f4', atmosphere: '#8de8f0' },
  neptune: { kind: 'ice', a: '#2440b8', b: '#6f9bf5', atmosphere: '#4f7dff' },
};

const KIND_INDEX: Record<Kind, number> = { rocky: 0, gas: 1, ice: 2, earth: 3 };

export const lookOf = (id: string): Look => LOOKS[id] ?? { kind: 'rocky', a: '#4b5563', b: '#a3aab5' };

/**
 * A planet sphere. Unvisited planets render as a blueprint "halftone" globe
 * (a lat/long dot lattice, as on the landing page's hero globe); planets on
 * the route light up into a lit procedural surface with an atmosphere rim.
 */
export class PlanetBody {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private halo: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null;
  private ring: THREE.Mesh<THREE.RingGeometry, THREE.ShaderMaterial> | null = null;
  private visited = 0;
  private visitedTarget = 0;
  private highlight = 0;
  private highlightTarget = 0;
  readonly id: string;

  constructor(
    id: string,
    radius: number,
    sunPos: THREE.Vector3,
    seed: number,
    land: THREE.Texture | null,
  ) {
    this.id = id;
    const look = lookOf(id);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: {
          uA: { value: new THREE.Color(look.a) },
          uB: { value: new THREE.Color(look.b) },
          uRim: { value: new THREE.Color(look.atmosphere ?? look.b) },
          uKind: { value: KIND_INDEX[look.kind] },
          uSeed: { value: seed },
          uSun: { value: sunPos },
          uLand: { value: land },
          uHasLand: { value: land ? 1 : 0 },
          uVisited: { value: 0 },
          uHighlight: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vObj;
          varying vec3 vWorld;
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          void main() {
            vObj = normalize(position);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uA, uB, uRim, uSun;
          uniform float uKind, uSeed, uHasLand, uVisited, uHighlight, uTime;
          uniform sampler2D uLand;
          varying vec3 vObj;
          varying vec3 vWorld;
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          ${noiseGLSL}
          const float PI = 3.14159265;

          float landAt(vec2 uv) { return uHasLand > 0.5 ? texture2D(uLand, uv).r : 0.0; }

          void main() {
            vec3 n = vObj;
            vec3 N = normalize(vNormalW);
            vec3 L = normalize(uSun - vWorld);
            float diff = max(dot(N, L), 0.0);
            float lon = atan(n.x, n.z);
            float lat = asin(clamp(n.y, -1.0, 1.0));
            vec2 uv = vec2(lon / (2.0 * PI) + 0.5, lat / PI + 0.5);
            vec3 s = n + uSeed;

            // ── lit procedural surface ──
            vec3 surf;
            if (uKind < 0.5) {
              float t = fbm(s * 3.0, 5) * 0.5 + 0.5;
              float craters = ridged(s * 9.0, 4);
              surf = mix(uA, uB, clamp(t + craters * 0.25 - 0.1, 0.0, 1.0));
            } else if (uKind < 1.5) {
              float warp = fbm(s * vec3(2.0, 7.0, 2.0) + vec3(uTime * 0.01, 0.0, 0.0), 4);
              float bands = sin(lat * 14.0 + warp * 2.6) * 0.5 + 0.5;
              surf = mix(uA, uB, bands);
              surf *= 0.85 + 0.3 * fbm(s * vec3(3.0, 18.0, 3.0), 3);
            } else if (uKind < 2.5) {
              float bands = sin(lat * 6.0 + fbm(s * 2.0, 3) * 1.2) * 0.5 + 0.5;
              surf = mix(uA, uB, 0.35 + 0.4 * bands);
            } else {
              float nz = fbm(n * 7.0, 5);
              float land = smoothstep(0.42, 0.58, landAt(uv) + nz * 0.18);
              float lat01 = abs(lat) / (PI * 0.5);
              vec3 ocean = mix(vec3(0.008, 0.04, 0.10), vec3(0.02, 0.10, 0.19), smoothstep(-0.4, 0.5, fbm(n * 3.0, 3)));
              float desert = smoothstep(0.14, 0.0, abs(lat01 - 0.27)) * smoothstep(-0.2, 0.35, fbm(n * 4.0 + 3.0, 4));
              vec3 landC = mix(vec3(0.09, 0.17, 0.07), vec3(0.40, 0.33, 0.22), clamp(desert + nz * 0.35, 0.0, 1.0));
              surf = mix(ocean, landC, land);
              surf = mix(surf, vec3(0.86, 0.9, 0.95), smoothstep(0.8, 0.9, lat01 + nz * 0.06));
              vec3 cp = n * vec3(2.4, 4.2, 2.4) + vec3(uTime * 0.006, 0.0, uTime * 0.002);
              float cl = fbm(cp + vec3(fbm(cp + 4.0, 3), fbm(cp + 9.0, 3), 0.0) * 0.9, 5);
              surf = mix(surf, vec3(0.92, 0.95, 1.0), smoothstep(0.1, 0.6, cl) * 0.8);
            }
            vec3 lit = surf * (0.04 + 0.85 * diff);
            float fres = pow(1.0 - max(dot(N, normalize(vViewDir)), 0.0), 3.0);
            lit += uRim * fres * (0.15 + 0.7 * smoothstep(-0.3, 0.8, dot(N, L))) * 0.6;

            // ── halftone blueprint globe ──
            const float RINGS = 36.0;
            float row = floor((lat / PI + 0.5) * RINGS);
            float rowLat = ((row + 0.5) / RINGS - 0.5) * PI;
            float count = max(1.0, floor(RINGS * 2.0 * cos(rowLat)));
            float colF = (lon / (2.0 * PI) + 0.5) * count;
            vec2 cell = vec2(fract(colF) - 0.5, fract((lat / PI + 0.5) * RINGS) - 0.5);
            float d = length(cell);
            float landDot = uHasLand > 0.5 ? landAt(uv) : 0.6;
            float radius = mix(0.18, 0.36, landDot);
            float aa = fwidth(d) * 1.2;
            float dotMask = 1.0 - smoothstep(radius - aa, radius + aa, d);
            float litDot = smoothstep(-0.35, 0.7, dot(N, L));
            vec3 dotCol = mix(vec3(0.06, 0.12, 0.26), vec3(0.55, 0.72, 0.95), litDot) * dotMask;
            dotCol += vec3(0.0, 0.35, 1.0) * fres * 0.5;
            vec3 holo = vec3(0.004, 0.008, 0.018) + dotCol;

            vec3 col = mix(holo + lit * 0.12, lit, uVisited);
            col += vec3(0.98, 0.42, 0.09) * fres * uHighlight * 0.9;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.group.add(this.mesh);

    if (look.atmosphere) {
      this.halo = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 64, 48),
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(look.atmosphere) }, uSun: { value: sunPos }, uIntensity: { value: 0 } },
          vertexShader: /* glsl */ `
            varying vec3 vN;
            varying vec3 vP;
            varying vec3 vWorld;
            varying vec3 vNW;
            void main() {
              vN = normalize(normalMatrix * normal);
              vNW = normalize(mat3(modelMatrix) * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
              vP = mv.xyz;
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor, uSun;
            uniform float uIntensity;
            varying vec3 vN;
            varying vec3 vP;
            varying vec3 vWorld;
            varying vec3 vNW;
            void main() {
              float f = dot(normalize(vN), normalize(-vP));
              float glow = pow(smoothstep(0.0, 0.62, -f), 3.0);
              float side = 0.3 + 0.7 * smoothstep(-0.6, 0.8, dot(normalize(vNW), normalize(uSun - vWorld)));
              gl_FragColor = vec4(uColor * glow * side * uIntensity * 0.55, 1.0);
            }`,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        }),
      );
      this.halo.scale.setScalar(1.22);
      this.group.add(this.halo);
    }

    if (look.ring) {
      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.35, radius * 2.25, 128, 1),
        new THREE.ShaderMaterial({
          uniforms: { uInner: { value: radius * 1.35 }, uOuter: { value: radius * 2.25 }, uVisited: { value: 0 } },
          vertexShader: /* glsl */ `
            varying vec3 vP;
            void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform float uInner, uOuter, uVisited;
            varying vec3 vP;
            void main() {
              float t = (length(vP.xy) - uInner) / (uOuter - uInner);
              float bands = 0.55 + 0.45 * sin(t * 60.0) * sin(t * 13.0 + 1.3);
              float edge = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.85, t) * (1.0 - smoothstep(0.62, 0.66, t) * smoothstep(0.7, 0.66, t));
              vec3 warm = vec3(0.85, 0.74, 0.52) * bands;
              vec3 holo = vec3(0.25, 0.5, 0.9) * bands * 0.6;
              gl_FragColor = vec4(mix(holo, warm, uVisited) * edge * 0.55, 1.0);
            }`,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        }),
      );
      this.ring.rotation.set(-Math.PI / 2 + 0.42, 0.18, 0);
      this.group.add(this.ring);
    }
  }

  setLand(land: THREE.Texture) {
    this.mesh.material.uniforms.uLand.value = land;
    this.mesh.material.uniforms.uHasLand.value = 1;
  }

  setVisited(visited: boolean) {
    this.visitedTarget = visited ? 1 : 0;
  }

  setHighlight(on: boolean) {
    this.highlightTarget = on ? 1 : 0;
  }

  update(time: number, dt: number, instant: boolean) {
    const k = instant ? 1 : 1 - Math.exp(-dt * 5);
    this.visited += (this.visitedTarget - this.visited) * k;
    this.highlight += (this.highlightTarget - this.highlight) * k;
    const u = this.mesh.material.uniforms;
    u.uVisited.value = this.visited;
    u.uHighlight.value = this.highlight;
    u.uTime.value = time;
    if (this.halo) this.halo.material.uniforms.uIntensity.value = 0.25 + 0.75 * this.visited;
    if (this.ring) this.ring.material.uniforms.uVisited.value = this.visited;
    if (!instant) this.mesh.rotation.y = time * 0.04;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}

/** The sun: a churning emissive sphere plus a soft corona sprite; bloom does the rest. */
export class SunBody {
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

  constructor(radius: number) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vObj;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vObj = normalize(position);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vObj;
          varying vec3 vN;
          varying vec3 vV;
          ${noiseGLSL}
          void main() {
            float t = fbm(vObj * 4.0 + vec3(0.0, uTime * 0.05, 0.0), 5) * 0.5 + 0.5;
            float cells = ridged(vObj * 10.0 + uTime * 0.02, 3);
            vec3 col = mix(vec3(1.0, 0.36, 0.06), vec3(1.0, 0.86, 0.5), t * 0.8 + cells * 0.3);
            float limb = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 0.45);
            gl_FragColor = vec4(col * (0.55 + 0.75 * limb), 1.0);
          }`,
      }),
    );
    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('255,140,40'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.7,
      }),
    );
    corona.scale.setScalar(radius * 5.5);
    this.group.add(corona, this.mesh);
  }

  update(time: number) {
    this.mesh.material.uniforms.uTime.value = time;
  }
}

/** Distant twinkling stars on a shell around the scene. */
export class Starfield {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

  constructor(count = 3200) {
    const rand = mulberry32(7);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
      v.multiplyScalar(90 + rand() * 80);
      pos.set([v.x, v.y, v.z], i * 3);
      seed[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aSeed;
          uniform float uTime, uPixelRatio;
          varying float vA;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vA = (0.25 + 0.75 * aSeed) * (0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0));
            gl_PointSize = (0.8 + aSeed * 1.6) * uPixelRatio;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * vA * smoothstep(0.5, 0.1, d), 1.0);
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.points.renderOrder = -2;
  }

  update(time: number, pixelRatio: number) {
    this.points.material.uniforms.uTime.value = time;
    this.points.material.uniforms.uPixelRatio.value = pixelRatio;
  }
}

/** Anti-aliased blueprint grid floor (from the landing page's clean room), fading out radially. */
export function gridFloor(size: number, minor: number, major: number, fadeFrom: number, fadeTo: number) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() {
          vP = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec2 vP;
        float grid(vec2 p, float size, float width) {
          vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
          return 1.0 - min(min(g.x, g.y) / width, 1.0);
        }
        void main() {
          float r = length(vP * vec2(0.6, 1.0));
          float fade = 1.0 - smoothstep(${fadeFrom.toFixed(2)}, ${fadeTo.toFixed(2)}, r);
          float minorL = grid(vP, ${minor.toFixed(3)}, 1.0) * 0.08;
          float majorL = grid(vP, ${major.toFixed(3)}, 1.2) * 0.18;
          vec3 col = vec3(0.6, 0.72, 0.9) * max(minorL, majorL);
          gl_FragColor = vec4(col * fade * uOpacity, 1.0);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Radial glow sprite texture; `rgb` like '255,255,255'. */
export function glowTexture(rgb = '255,255,255') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(0.2, `rgba(${rgb},0.55)`);
  grd.addColorStop(0.45, `rgba(${rgb},0.12)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
