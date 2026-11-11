import * as THREE from './vendor/three/three.module.js';

export const MIN_ZOOM = 0.65;
export const MAX_ZOOM = 3;
export const clampZoom = value => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(value) ? value : 1));
export function zoomAfterWheel(zoom, delta, mode, viewportHeight) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
  return clampZoom(zoom * Math.exp(-Math.max(-160, Math.min(160, pixels)) * 0.0015));
}

// Fixed dimensions of solid rectangular wall faces, in world-space metres.
// No camera input, room bounding boxes, or per-frame raycasting. Reject faces
// with openings/disconnected patches rather than measuring across their gaps.
export function collectWallSurfaces(root) {
  const surfaces = [], up = new THREE.Vector3(0, 1, 0);
  root.updateMatrixWorld(true);
  root.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh.userData.layer !== 'Walls') return;
    const geometry = mesh.geometry, position = geometry.attributes.position;
    if (!position) return;
    const index = geometry.index, count = index ? index.count : position.count;
    const planes = new Map();
    for (let i = 0; i < count; i += 3) {
      const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld));
      const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
      const area = normal.length() / 2;
      if (area < 1e-8) continue;
      normal.normalize();
      if (Math.abs(normal.y) > .001) continue;
      normal.y = 0; normal.normalize();
      const distance = normal.dot(points[0]);
      const key = [...normal.toArray(), distance].map(n => (Math.abs(n) < .00005 ? 0 : n).toFixed(4)).join(',');
      if (!planes.has(key)) planes.set(key, { normal, distance, points: [], area: 0 });
      const plane = planes.get(key); plane.points.push(...points); plane.area += area;
    }
    for (const plane of planes.values()) {
      const right = up.clone().cross(plane.normal).normalize();
      const horizontal = plane.points.map(point => point.dot(right));
      const vertical = plane.points.map(point => point.y);
      const left = Math.min(...horizontal), bottom = Math.min(...vertical);
      const width = Math.max(...horizontal) - left, height = Math.max(...vertical) - bottom;
      if (width < 1.1 || height < 1.8 || plane.area / (width * height) < .985) continue;
      const origin = right.clone().multiplyScalar(left).addScaledVector(up, bottom).addScaledVector(plane.normal, plane.distance);
      surfaces.push({ id: `${mesh.name || mesh.uuid}:${surfaces.length}`, mesh: mesh.name, width, height,
        origin: origin.toArray(), right: right.toArray(), normal: plane.normal.toArray() });
    }
  });
  return surfaces;
}
