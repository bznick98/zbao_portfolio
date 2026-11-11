import * as THREE from 'three';

export function distanceMeters(a, b) {
  if (![...a, ...b].every(Number.isFinite) || a.length !== 3 || b.length !== 3) throw new Error('A measurement needs two finite 3D points.');
  return Math.hypot(...a.map((value, index) => value - b[index]));
}

export function pickSurface(root, camera, ndc) {
  root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), meshes = [];
  root.traverseVisible(object => { if (object.isMesh) meshes.push(object); });
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? { point: hit.point.toArray(), object: hit.object.name, layer: hit.object.userData.layer } : null;
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
