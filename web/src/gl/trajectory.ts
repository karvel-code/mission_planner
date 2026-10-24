import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { MissionResult, Planet, Spacecraft } from '../api/schemas'
import { EARTH } from '../lib/mission'
import { buildSchematic, legPoints, type Point, type Schematic } from '../planner/schematic'
import { glowTexture, gridFloor, PlanetBody, Starfield, SunBody } from './bodies'
import { shipSpec } from './fleet'
import { Ship, type FleetScale } from './ship'
import { Stage } from './stage'

// The 3D trajectory view from the TEC concept: blueprint globes that light up
// when on the route, the Sun, the route as glowing lines, and a spacecraft
// flying it on a loop. Unlike the concept, it never solves a path itself: each
// leg is the API's path, mapped through the same schematic as the SVG view
// (planner/schematic.ts) and then from screen units into world units.

const PATH = new THREE.Color('#00a1ff')
const TRAIL = new THREE.Color('#8fd8ff')
const ACCENT = new THREE.Color('#fc6a18')
/** Screen units of the schematic per world unit. */
const UNITS = 40
/** Resampled points per leg, so the trail grows smoothly. */
const SAMPLES = 240
/** Lifts a path off a surface it follows, so the sphere doesn't hide it. */
const SURFACE_LIFT = 1.03
const VIEW_DIR = new THREE.Vector3(0, 0.34, 1).normalize()

interface WorldBody {
  planet: Planet
  x: number
  r: number
}

interface LegView {
  base: Line2
  trail: Line2
  points: Point[]
  label: CSS2DObject
  land: THREE.Sprite
}

export interface TrajectoryEvents {
  /** The pointer moved onto a leg (its index) or off every leg (null). */
  onHoverLeg?: (leg: number | null) => void
}

export class TrajectoryScene extends Stage {
  private labels = new CSS2DRenderer()
  private controls: OrbitControls
  private schematic: Schematic
  private worldBodies: WorldBody[]
  private sunX: number
  private bodies = new Map<number, PlanetBody>()
  private planetLabels = new Map<number, HTMLElement>()
  private sun: SunBody
  private stars = new Starfield()
  private routeGroup = new THREE.Group()
  private legs: LegView[] = []
  private lineMaterials: LineMaterial[] = []
  private ship: Ship | null = null
  private shipGlow: THREE.Sprite
  private landTex = glowTexture('252,106,24')
  private result: MissionResult | null = null
  private highlighted: number | null = null
  private hovered: number | null = null
  private loopTime = 0
  private raycaster = new THREE.Raycaster()
  private pointer: THREE.Vector2 | null = null
  private camGoal: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null
  private fleet: FleetScale
  private events: TrajectoryEvents

  constructor(container: HTMLElement, planets: Planet[], fleet: FleetScale, events: TrajectoryEvents = {}) {
    super(container, { fov: 32, bloom: [0.6, 0.45, 0.62] })
    this.fleet = fleet
    this.events = events
    this.schematic = buildSchematic(planets)
    this.worldBodies = this.schematic.bodies.map(({ planet, cx, r }) => ({
      planet,
      x: (cx - this.schematic.width / 2) / UNITS,
      r: r / UNITS,
    }))

    this.labels.domElement.className = 'gl-labels'
    container.append(this.labels.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 1.2
    this.controls.maxDistance = 70
    this.controls.maxPolarAngle = Math.PI * 0.62
    this.controls.addEventListener('start', () => (this.camGoal = null))

    const star = this.worldBodies.find((b) => !b.planet.destination)
    this.sunX = star?.x ?? this.worldBodies[0].x - 1.5
    const sunPos = new THREE.Vector3(this.sunX, 0, 0)
    this.sun = new SunBody(star?.r ?? 0.75)
    this.sun.group.position.copy(sunPos)
    this.scene.add(this.stars.points, this.sun.group, this.routeGroup)

    const floor = gridFloor(120, 0.5, 2.5, 10, 30)
    floor.position.y = -2.4
    this.scene.add(floor, this.alignmentAxis())

    this.worldBodies.forEach((body, i) => {
      if (body.planet.destination) {
        const globe = new PlanetBody(body.planet.slug, body.r, sunPos, i * 3.7, null)
        globe.group.position.set(body.x, 0, 0)
        this.scene.add(globe.group)
        this.bodies.set(body.planet.id, globe)
      }

      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'gl-label planet'
      el.innerHTML = '<span class="gl-name"></span><span class="gl-tag"></span>'
      el.querySelector('.gl-name')!.textContent = body.planet.name
      el.addEventListener('click', () => this.focus(body.planet.id))
      const label = new CSS2DObject(el)
      label.position.set(body.x, -body.r - 0.32, 0)
      this.scene.add(label)
      this.planetLabels.set(body.planet.id, el)
    })

    this.shipGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture('143,216,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    this.shipGlow.scale.setScalar(0.5)
    this.shipGlow.visible = false
    this.scene.add(this.shipGlow)

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove)
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave)

    this.setResult(null, [], null)
    this.start()
    this.fit(true)
  }

  /** Shows a calculated mission, or just the planets when `result` is null. */
  setResult(result: MissionResult | null, routeIds: number[], spacecraft: Spacecraft | null) {
    this.result = result
    const earthId = this.worldBodies.find((b) => b.planet.name === EARTH)?.planet.id
    const onRoute = new Set(routeIds)

    for (const [id, body] of this.bodies) body.setVisited(onRoute.has(id) || id === earthId)
    for (const [id, el] of this.planetLabels) {
      const stops = routeIds.flatMap((r, i) => (r === id && i > 0 ? [i] : []))
      el.classList.toggle('on-route', onRoute.has(id))
      el.querySelector('.gl-tag')!.textContent = id === earthId ? 'Home' : stops.length ? `Stop ${stops.join(', ')}` : ''
    }

    this.clearRoute()
    if (result && spacecraft) this.buildRoute(result, spacecraft)
    this.loopTime = 0
    this.fit()
  }

  /** Emphasises one leg, e.g. while its table row is hovered. */
  highlightLeg(index: number | null) {
    this.highlighted = index
    this.legs.forEach((leg, i) => {
      const on = i === index
      const dim = index !== null && !on
      const base = leg.base.material as LineMaterial
      base.color.copy(on ? ACCENT : PATH)
      base.opacity = dim ? 0.15 : on ? 0.95 : 0.4
      ;(leg.trail.material as LineMaterial).opacity = dim ? 0.2 : 0.85
      leg.label.element.classList.toggle('active', on)
    })
    const leg = index !== null ? this.result?.legs[index] : undefined
    for (const [id, body] of this.bodies) body.setHighlight(!!leg && (leg.from_planet_id === id || leg.to_planet_id === id))
  }

  /** Frames the whole route, or every body when there is no route. */
  fit(instant = false) {
    const ids = this.result ? new Set(this.result.legs.flatMap((l) => [l.from_planet_id, l.to_planet_id])) : null
    const framed = this.worldBodies.filter((b) => (ids ? ids.has(b.planet.id) : true))
    const lo = Math.min(...framed.map((b) => b.x - b.r))
    const hi = Math.max(...framed.map((b) => b.x + b.r))
    let top = Math.max(...framed.map((b) => b.r))
    for (const leg of this.legs) for (const p of leg.points) top = Math.max(top, p.y)

    const width = Math.max(hi - lo, 3) * 1.18
    const height = (top + 1.2) * 1.6
    this.frame(new THREE.Vector3((lo + hi) / 2, top * 0.3, 0), width, height, instant)
  }

  focus(planetId: number) {
    const body = this.worldBodies.find((b) => b.planet.id === planetId)
    if (!body) return
    // Aim slightly below the centre so the planet clears the figures at the bottom.
    this.frame(new THREE.Vector3(body.x, -body.r * 0.6, 0), Math.max(body.r * 11, 3), body.r * 8, false)
  }

  private frame(target: THREE.Vector3, width: number, height: number, instant: boolean) {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect)
    const dist = Math.max(width / 2 / Math.tan(hFov / 2), height / 2 / Math.tan(vFov / 2))
    const pos = target.clone().addScaledVector(VIEW_DIR, dist)
    if (instant || this.still) {
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
      this.controls.update()
      this.camGoal = null
    } else {
      this.camGoal = { pos, target }
    }
  }

  /** A screen point of the schematic in world units, lifted off any surface it touches. */
  private toWorld(p: Point): Point {
    const world = { x: (p.x - this.schematic.width / 2) / UNITS, y: (this.schematic.axisY - p.y) / UNITS }
    for (const body of this.worldBodies) {
      const dx = world.x - body.x
      const d = Math.hypot(dx, world.y)
      if (d > 0 && d < body.r * SURFACE_LIFT) {
        const k = (body.r * SURFACE_LIFT) / d
        return { x: body.x + dx * k, y: world.y * k }
      }
    }
    return world
  }

  private buildRoute(result: MissionResult, spacecraft: Spacecraft) {
    result.legs.forEach((leg, index) => {
      const points = resample(legPoints(leg, this.schematic).map((p) => this.toWorld(p)), SAMPLES)
      const flat = points.flatMap((p) => [p.x, p.y, 0])
      const base = this.line(flat, PATH, 2.2, 0.4)
      base.userData.leg = index
      const trail = this.line(flat, TRAIL, 2.6, 0.85)
      trail.geometry.instanceCount = this.still ? SAMPLES : 0

      const badge = document.createElement('span')
      badge.className = 'gl-label leg'
      badge.textContent = String(index + 1)
      badge.addEventListener('pointerenter', () => this.setHovered(index))
      badge.addEventListener('pointerleave', () => this.setHovered(null))
      const label = new CSS2DObject(badge)
      // A leg back towards the Sun often retraces an outbound one: put its badge below the line instead.
      const mid = pointAt(points, 0.5)
      const sunward = points[points.length - 1].x < points[0].x
      label.position.set(mid.x, mid.y + (sunward ? -0.24 : 0.22), 0)

      const land = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.landTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      )
      const end = points[points.length - 1]
      land.position.set(end.x, end.y, 0)
      land.scale.setScalar(0.32)

      this.routeGroup.add(base, trail, label, land)
      this.legs.push({ base, trail, points, label, land })
    })

    const depart = this.legs[0]?.points[0]
    if (depart) {
      const start = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture('0,161,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      )
      start.position.set(depart.x, depart.y, 0)
      start.scale.setScalar(0.4)
      this.routeGroup.add(start)
    }

    this.ship = new Ship(shipSpec(spacecraft), this.fleet)
    this.ship.setAssembly(1)
    this.ship.group.scale.setScalar(0.16)
    this.routeGroup.add(this.ship.group)
    this.shipGlow.visible = true
    this.highlightLeg(this.highlighted !== null && this.highlighted < this.legs.length ? this.highlighted : null)
  }

  private line(flat: number[], color: THREE.Color, width: number, opacity: number) {
    const geo = new LineGeometry()
    geo.setPositions(flat)
    const mat = new LineMaterial({
      color: color.clone(),
      linewidth: width,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    mat.resolution.set(this.width, this.height)
    this.lineMaterials.push(mat)
    return new Line2(geo, mat)
  }

  private clearRoute() {
    for (const child of [...this.routeGroup.children]) {
      this.routeGroup.remove(child)
      if (child instanceof CSS2DObject) child.element.remove()
      if (child instanceof Line2) child.geometry.dispose()
      if (child instanceof THREE.Sprite) child.material.dispose()
    }
    this.lineMaterials.forEach((m) => m.dispose())
    this.lineMaterials = []
    this.ship?.dispose()
    this.ship = null
    this.shipGlow.visible = false
    this.legs = []
    this.setHovered(null)
  }

  // Hovering a drawn leg (not just its badge) reports it, for the leg table.
  private onPointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  private onPointerLeave = () => {
    this.pointer = null
    this.setHovered(null)
  }

  private pickLeg() {
    if (!this.pointer || this.legs.length === 0) return
    this.raycaster.setFromCamera(this.pointer, this.camera)
    this.raycaster.params.Line2 = { threshold: 10 }
    const hit = this.raycaster.intersectObjects(this.legs.map((l) => l.base), false)[0]
    this.setHovered(hit ? (hit.object.userData.leg as number) : null)
  }

  private setHovered(leg: number | null) {
    if (leg === this.hovered) return
    this.hovered = leg
    this.events.onHoverLeg?.(leg)
  }

  protected onResize(w: number, h: number) {
    this.labels.setSize(w, h)
    this.lineMaterials.forEach((m) => m.resolution.set(w, h))
  }

  protected update(time: number, dt: number) {
    this.stars.update(time, this.pixelRatio)
    this.sun.update(time)
    for (const body of this.bodies.values()) body.update(time, dt, this.still)

    if (this.camGoal) {
      const k = 1 - Math.exp(-dt * 3.2)
      this.camera.position.lerp(this.camGoal.pos, k)
      this.controls.target.lerp(this.camGoal.target, k)
      if (this.camera.position.distanceTo(this.camGoal.pos) < 0.01) this.camGoal = null
    }
    this.controls.update()
    this.pickLeg()

    if (this.ship && this.legs.length) this.flyShip(time, dt)
  }

  /** Moves the spacecraft along the route on a loop, growing the bright trail behind it. */
  private flyShip(time: number, dt: number) {
    const perLeg = 2.6 // seconds
    const hold = 1.4
    const total = this.legs.length * perLeg
    let progress = this.legs.length // in legs
    if (!this.still) {
      this.loopTime = (this.loopTime + dt) % (total + hold)
      progress = Math.min(this.loopTime, total) / perLeg
    }
    const legIndex = Math.min(this.legs.length - 1, Math.floor(progress))
    const t = progress - legIndex
    this.legs.forEach((leg, i) => {
      leg.trail.geometry.instanceCount = i < legIndex ? SAMPLES : i === legIndex ? Math.floor(ease(t) * SAMPLES) : 0
      leg.land.material.opacity = i < legIndex || (i === legIndex && t >= 1) ? 1 : 0.35
    })

    const points = this.legs[legIndex].points
    const e = ease(Math.min(t, 1))
    const p = pointAt(points, e)
    const ahead = pointAt(points, Math.min(1, e + 0.01))
    const behind = pointAt(points, Math.max(0, e - 0.01))
    this.ship!.group.position.set(p.x, p.y, 0)
    this.ship!.group.rotation.z = Math.atan2(ahead.y - behind.y, ahead.x - behind.x)
    this.ship!.update(time)
    this.shipGlow.position.set(p.x, p.y, 0)
  }

  protected afterRender() {
    this.labels.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave)
    this.clearRoute()
    this.controls.dispose()
    for (const body of this.bodies.values()) body.dispose()
    this.labels.domElement.remove()
    super.dispose()
  }

  /** Faint dashed line through every centre: the 2041 alignment, with a tick under each planet. */
  private alignmentAxis() {
    const group = new THREE.Group()
    const last = this.worldBodies[this.worldBodies.length - 1]
    const axis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(this.sunX, 0, 0), new THREE.Vector3(last.x + 3, 0, 0)]),
      new THREE.LineDashedMaterial({ color: '#3d6c9c', dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.6 }),
    )
    axis.computeLineDistances()
    group.add(axis)

    const ticks = this.worldBodies
      .filter((b) => b.planet.destination)
      .flatMap((b) => [b.x, -b.r - 0.08, 0, b.x, -b.r - 0.2, 0])
    const tickGeo = new THREE.BufferGeometry()
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3))
    group.add(new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: '#4f86bd', transparent: true, opacity: 0.7 })))
    return group
  }
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const polylineLength = (points: Point[]) =>
  points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0)

/** The point at fraction `t` (0…1) of a polyline's length. */
function pointAt(points: Point[], t: number): Point {
  const target = polylineLength(points) * Math.min(1, Math.max(0, t))
  let walked = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (walked + seg >= target && seg > 0) {
      const f = (target - walked) / seg
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
    }
    walked += seg
  }
  return points[points.length - 1]
}

const resample = (points: Point[], n: number) => Array.from({ length: n + 1 }, (_, i) => pointAt(points, i / n))
