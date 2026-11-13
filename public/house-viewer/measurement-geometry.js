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

export { buildWallSurfaceManifest } from './wall-surfaces.js';
import { buildWallSurfaceManifest } from './wall-surfaces.js';
export function collectWallSurfaces(root) { return buildWallSurfaceManifest(root).surfaces; }
