import * as THREE from './vendor/three/three.module.js';

export const MIN_ZOOM = 0.65;
export const MAX_ZOOM = 3;
export const clampZoom = value => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(value) ? value : 1));
export function zoomAfterWheel(zoom, delta, mode, viewportHeight) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
  return clampZoom(zoom * Math.exp(-Math.max(-160, Math.min(160, pixels)) * 0.0015));
}

// glTF is in metres. Measure actual triangle intersections, never room bounding
// boxes: concave/angled rooms and open doors must not invent closed boundaries.
export function createSectionMeasurer(root) {
  const boundaries = [], floors = [], ceilings = [];
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!object.isMesh || !object.visible) return;
    const layer = object.userData.layer;
    if (['Walls', 'Structure', 'Windows', 'Doors'].includes(layer)) boundaries.push(object);
    if (layer === 'Floors') floors.push(object);
    if (layer === 'Ceilings') ceilings.push(object);
  });
  const ray = new THREE.Raycaster(undefined, undefined, 0.015, 40);
  const down = new THREE.Vector3(0, -1, 0), up = new THREE.Vector3(0, 1, 0);
  function hit(origin, direction, objects) {
    ray.set(origin, direction);
    return ray.intersectObjects(objects, false).find(result => result.object.visible);
  }
  return function measure(camera) {
    const eye = camera.getWorldPosition(new THREE.Vector3());
    const forward = camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0;
    if (forward.lengthSq() < 0.001) return [];
    forward.normalize();
    const front = hit(eye, forward, boundaries);
    const reach = front ? Math.min(1.5, Math.max(0.08, front.distance - 0.25)) : 1.5;
    const anchor = eye.clone().addScaledVector(forward, reach);
    const floor = hit(anchor, down, floors);
    if (!floor) return [];
    anchor.y = floor.point.y + 1.2;
    const measurements = [];
    function add(id, label, a, b) {
      const metres = a.distanceTo(b);
      if (metres < 0.2 || metres > 40) return;
      measurements.push({ id, label, metres, a: a.toArray(), b: b.toArray() });
    }
    for (const [id, label, axis] of [
      ['width', '横向净跨', new THREE.Vector3(1, 0, 0)],
      ['depth', '纵向净跨', new THREE.Vector3(0, 0, 1)],
    ]) {
      const positive = hit(anchor, axis, boundaries);
      const negative = hit(anchor, axis.clone().negate(), boundaries);
      if (positive && negative) add(id, label, negative.point, positive.point);
    }
    const ceiling = hit(anchor, up, ceilings);
    if (ceiling) add('height', '模型净高', floor.point, ceiling.point);
    return measurements;
  };
}

// Clip in homogeneous coordinates before projecting: labels behind the camera
// disappear, while a measurement crossing the screen keeps a finite line.
export function projectDimension(measurement, camera, width, height) {
  const transform = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const a = new THREE.Vector4(...measurement.a, 1).applyMatrix4(transform);
  const b = new THREE.Vector4(...measurement.b, 1).applyMatrix4(transform);
  const planes = [p => p.w + p.x, p => p.w - p.x, p => p.w + p.y, p => p.w - p.y, p => p.w + p.z, p => p.w - p.z];
  let start = 0, end = 1;
  for (const plane of planes) {
    const first = plane(a), last = plane(b);
    if (first < 0 && last < 0) return null;
    if (first < 0) start = Math.max(start, first / (first - last));
    if (last < 0) end = Math.min(end, first / (first - last));
    if (start > end) return null;
  }
  const point = t => {
    const v = a.clone().lerp(b, t);
    return [(v.x / v.w + 1) * width / 2, (1 - v.y / v.w) * height / 2];
  };
  const from = point(start), to = point(end);
  if (![...from, ...to].every(Number.isFinite)) return null;
  return { from, to, clippedStart: start > 0, clippedEnd: end < 1 };
}
