// Ported from the TEC concept (tec-frontend-work, src/gl/hangar.ts), kept in its original style.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gridFloor, Starfield } from './bodies';
import { Ship, type FleetScale, type ShipSpec } from './ship';
import { Stage } from './stage';

/**
 * Spacecraft preview: the selected ship as a holographic blueprint on the
 * clean-room grid. Switching ships explodes the old one and assembles the new.
 */
export class HangarScene extends Stage {
  private controls: OrbitControls;
  private stars = new Starfield(900);
  private ship: Ship | null = null;
  private outgoing: Ship | null = null;
  private assembly = 1;
  private outgoingT = 0;
  private yaw = -0.6;
  private fleet: FleetScale;

  constructor(container: HTMLElement, fleet: FleetScale) {
    super(container, { fov: 30, bloom: [0.7, 0.4, 0.45] });
    this.fleet = fleet;
    this.camera.position.set(3.2, 1.6, 4.6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = Math.PI * 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.55;

    const floor = gridFloor(40, 0.25, 1.25, 2, 7);
    floor.position.y = -0.9;
    this.scene.add(this.stars.points, floor);
    this.start();
  }

  setShip(spec: ShipSpec) {
    if (this.outgoing) {
      this.scene.remove(this.outgoing.group);
      this.outgoing.dispose();
    }
    this.outgoing = this.ship;
    this.outgoingT = 1;
    this.ship = new Ship(spec, this.fleet);
    this.assembly = this.still ? 1 : 0;
    this.ship.setAssembly(this.assembly);
    this.scene.add(this.ship.group);
    // Frame the assembled ship's bounding sphere (it spins, so every side must fit).
    this.ship.setAssembly(1);
    const radius = new THREE.Box3().setFromObject(this.ship.group).getBoundingSphere(new THREE.Sphere()).radius;
    this.ship.setAssembly(this.assembly);
    // Aim above the ship so it sits below the title overlay.
    this.controls.target.set(0, radius * 0.18, 0);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const fov = Math.min(vFov, 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect));
    const dist = (radius / Math.sin(fov / 2)) * 1.05;
    this.camera.position.sub(this.controls.target).setLength(dist).add(this.controls.target);
  }

  protected update(time: number, dt: number) {
    this.stars.update(time, this.pixelRatio);
    if (this.outgoing) {
      this.outgoingT = Math.max(0, this.outgoingT - dt * 2.4);
      this.outgoing.setAssembly(this.outgoingT);
      if (this.outgoingT === 0) {
        this.scene.remove(this.outgoing.group);
        this.outgoing.dispose();
        this.outgoing = null;
      }
    }
    if (this.ship) {
      if (this.assembly < 1) {
        this.assembly = Math.min(1, this.assembly + dt * 0.9);
        this.ship.setAssembly(this.assembly);
      }
      if (!this.still) this.yaw += dt * 0.25;
      this.ship.group.rotation.set(0, this.yaw, Math.sin(time * 0.6) * 0.03);
      this.ship.group.position.y = this.still ? 0 : Math.sin(time * 0.9) * 0.04;
      this.ship.update(time);
    }
    this.controls.update();
  }

  dispose() {
    this.ship?.dispose();
    this.outgoing?.dispose();
    this.controls.dispose();
    super.dispose();
  }
}
