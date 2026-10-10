import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

let initialization: Promise<void> | undefined;
export const initializePoePhysics = () => (initialization ??= RAPIER.init());

export type PoeFace = 'flat' | 'round' | 'edge';
export type PoeReading = 'yes' | 'no' | 'again' | 'edge' | 'unsettled';
export type Rotation = { x: number; y: number; z: number; w: number };

export const faceUp = (rotation: Rotation): PoeFace => {
  // The flat face's local normal is -Z. Measure it against world up.
  const up = 2 * (rotation.w * rotation.x - rotation.y * rotation.z);
  return up > 0.55 ? 'flat' : up < -0.55 ? 'round' : 'edge';
};

export const readFaces = (faces: PoeFace[]): PoeReading => {
  if (faces.length !== 2 || faces.includes('edge')) return 'edge';
  if (faces[0] !== faces[1]) return 'yes';
  return faces[0] === 'round' ? 'no' : 'again';
};

export const createPoeGeometry = () => {
  // A flat back and a rounded, tapered front: the narrow rim cannot become
  // a third broad resting face. The renderer and collider share these vertices.
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const flat = new THREE.Color('#eed2a4'), round = new THREE.Color('#9f2935');
  const lengthSegments = 24, widthSegments = 12;
  const vertex = (x: number, y: number, z: number, color: THREE.Color) => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    return positions.length / 3 - 1;
  };
  for (let row = 0; row <= lengthSegments; row++) {
    const angle = Math.PI * row / lengthSegments;
    const width = Math.sin(angle), x = 1.25 * Math.cos(angle);
    for (let column = 0; column <= widthSegments; column++) {
      const across = column / widthSegments * 2 - 1;
      vertex(x, width * (0.22 + 0.62 * across), 0.55 * width * Math.sqrt(Math.max(0, 1 - across * across)), round);
      if (row && column) {
        const current = row * (widthSegments + 1) + column;
        const previous = current - widthSegments - 1;
        indices.push(previous - 1, current, current - 1, previous - 1, previous, current);
      }
    }
  }
  const center = vertex(0, 0.15, 0, flat);
  const outline: number[] = [];
  for (let row = 0; row <= lengthSegments; row++) {
    const angle = Math.PI * row / lengthSegments;
    outline.push(vertex(1.25 * Math.cos(angle), -0.4 * Math.sin(angle), 0, flat));
  }
  for (let row = lengthSegments - 1; row > 0; row--) {
    const angle = Math.PI * row / lengthSegments;
    outline.push(vertex(1.25 * Math.cos(angle), 0.84 * Math.sin(angle), 0, flat));
  }
  for (let index = 0; index < outline.length; index++) {
    indices.push(center, outline[index], outline[(index + 1) % outline.length]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

const STEP = 1 / 120;

export class PoeSimulation {
  readonly world: RAPIER.World;
  readonly bodies: RAPIER.RigidBody[];
  state: 'ready' | 'throwing' | 'settled' = 'ready';
  reading: PoeReading | null = null;
  faces: PoeFace[] = [];
  private accumulator = 0;
  private elapsed = 0;
  private restTime = 0;
  private readonly random: () => number;

  constructor(vertices: Float32Array, random = Math.random) {
    this.random = random;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.world.integrationParameters.numSolverIterations = 12;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(5.2, 0.14, 4).setTranslation(0, -0.14, 0).setFriction(0.8));
    for (const side of [-1, 1]) {
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.12, 0.45, 4.2).setTranslation(side * 5.2, 0.3, 0));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(5.2, 0.45, 0.12).setTranslation(0, 0.3, side * 4.1));
    }
    this.bodies = [-1, 1].map(side => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(side * 1.65, 1, 0)
        .setRotation({ x: side * Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 })
        .setLinearDamping(0.3).setAngularDamping(0.9)
        .setCcdEnabled(true).setAdditionalSolverIterations(4));
      const points = new Map<string, number[]>();
      for (let index = 0; index < vertices.length; index += 3) {
        const point = Array.from(vertices.slice(index, index + 3), value => Math.round(value * 100000) / 100000);
        points.set(point.join(','), point);
      }
      const hull = RAPIER.ColliderDesc.convexHull(new Float32Array([...points.values()].flat()));
      if (!hull) throw new Error('Cannot construct Poe collider');
      this.world.createCollider(hull.setFriction(0.75).setRestitution(0.12).setDensity(1.5), body);
      return body;
    });
    for (let step = 0; step < 300; step++) this.world.step();
    this.bodies.forEach(body => body.sleep());
  }

  cast(power = 0.5, direction = 0) {
    if (this.state === 'throwing') return false;
    const strength = Math.max(0.2, Math.min(1, power));
    this.elapsed = this.restTime = this.accumulator = 0;
    this.reading = null;
    this.faces = [];
    this.state = 'throwing';
    this.bodies.forEach((body, index) => {
      const u = this.random(), v = this.random() * Math.PI * 2, w = this.random() * Math.PI * 2;
      body.setTranslation({ x: index === 0 ? -1.5 : 1.5, y: 1.2, z: 0 }, true);
      body.setRotation({
        x: Math.sqrt(1 - u) * Math.sin(v), y: Math.sqrt(1 - u) * Math.cos(v),
        z: Math.sqrt(u) * Math.sin(w), w: Math.sqrt(u) * Math.cos(w),
      }, true);
      body.resetForces(true);
      body.resetTorques(true);
      body.setLinvel({
        x: (index === 0 ? 1 : -1) * (0.4 + this.random() * 0.8) + Math.max(-1, Math.min(1, direction)),
        y: 4.6 + strength * 3.2, z: (this.random() - 0.5) * 2.4,
      }, true);
      body.setAngvel({
        x: (this.random() - 0.5) * 18,
        y: (this.random() - 0.5) * 16,
        z: (this.random() - 0.5) * 18,
      }, true);
    });
    return true;
  }

  step(delta: number) {
    this.accumulator += Math.max(0, Math.min(delta, 0.1));
    while (this.accumulator >= STEP) {
      this.world.step();
      this.accumulator -= STEP;
      if (this.state !== 'throwing') continue;
      this.elapsed += STEP;
      const resting = this.bodies.every(body => {
        const linear = body.linvel(), angular = body.angvel();
        return body.translation().y < 1.5 && (body.isSleeping() ||
          (Math.hypot(linear.x, linear.y, linear.z) < 0.1 && Math.hypot(angular.x, angular.y, angular.z) < 0.18));
      });
      this.restTime = resting && this.elapsed > 0.6 ? this.restTime + STEP : 0;
      if (this.restTime >= 0.45) {
        this.faces = this.bodies.map(body => faceUp(body.rotation()));
        this.reading = readFaces(this.faces);
        this.bodies.forEach(body => body.sleep());
        this.state = 'settled';
      } else if (this.elapsed > 12) {
        // A difficult landing is a retry, never a fabricated yes/no reading.
        this.reading = 'unsettled';
        this.state = 'settled';
      }
    }
  }

  dispose() { this.world.free(); }
}
