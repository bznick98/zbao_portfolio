import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/house-viewer/vendor/three/three.module.js';
import { createSectionMeasurer, projectDimension, zoomAfterWheel, clampZoom } from '../public/house-viewer/measurements.js';

function fixture({ openSide = false, ceiling = true, rotation = 0 } = {}) {
  const room = new THREE.Group();
  const material = new THREE.MeshBasicMaterial();
  function box(layer, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.userData.layer = layer; mesh.position.set(...position); room.add(mesh);
  }
  box('Floors', [6, .2, 8], [0, -.1, 0]);
  if (ceiling) box('Ceilings', [6, .2, 8], [0, 3.1, 0]);
  box('Walls', [.2, 3, 8.4], [-3.1, 1.5, 0]);
  if (!openSide) box('Walls', [.2, 3, 8.4], [3.1, 1.5, 0]);
  box('Walls', [6.4, 3, .2], [0, 1.5, -4.1]);
  box('Windows', [6.4, 3, .2], [0, 1.5, 4.1]);
  box('Joinery', [1, 2, 1], [1, 1, -1.5]);
  room.rotation.y = rotation;
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, .08, 100);
  camera.position.set(0, 1.6, 0); camera.lookAt(0, 1.6, -1); camera.updateMatrixWorld(true);
  return { room, camera };
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < .0001, `${actual} ≠ ${expected}`);

test('measures inner wall faces and floor-to-ceiling height in metres, ignoring furniture', () => {
  const { room, camera } = fixture();
  const values = createSectionMeasurer(room)(camera);
  near(values.find(v => v.id === 'width').metres, 6);
  near(values.find(v => v.id === 'depth').metres, 8);
  near(values.find(v => v.id === 'height').metres, 3);
  for (const value of values) near(Math.hypot(...value.a.map((n, i) => n - value.b[i])), value.metres);
});
test('does not invent dimensions across an absent wall or ceiling', () => {
  const { room, camera } = fixture({ openSide: true, ceiling: false });
  const values = createSectionMeasurer(room)(camera);
  assert.deepEqual(values.map(v => v.id), ['depth']);
});
test('rotated geometry measures ray intersections instead of world bounding-box extents', () => {
  const { room, camera } = fixture({ rotation: Math.PI / 6 });
  const values = createSectionMeasurer(room)(camera);
  near(values.find(v => v.id === 'width').metres, 6 / Math.cos(Math.PI / 6));
  near(values.find(v => v.id === 'depth').metres, 8 / Math.cos(Math.PI / 6));
});
test('projects crossing dimensions into the viewport and drops geometry behind the camera', () => {
  const { camera } = fixture();
  const result = projectDimension({ a: [-100, 1.2, -5], b: [100, 1.2, -5] }, camera, 1440, 810);
  assert.equal(result.clippedStart, true); assert.equal(result.clippedEnd, true);
  near(result.from[0], 0); near(result.to[0], 1440);
  assert.ok([...result.from, ...result.to].every(Number.isFinite));
  assert.equal(projectDimension({ a: [0, 1.2, 5], b: [1, 1.2, 5] }, camera, 1440, 810), null);
});
test('wheel zoom supports pixel/line units, bounds magnification and preserves camera position', () => {
  near(zoomAfterWheel(1, -32, 0, 900), zoomAfterWheel(1, -2, 1, 900));
  assert.ok(zoomAfterWheel(1, -100, 0, 900) > 1);
  assert.ok(zoomAfterWheel(1, 100, 0, 900) < 1);
  assert.equal(zoomAfterWheel(3, -1000, 0, 900), 3);
  assert.equal(zoomAfterWheel(.65, 1000, 2, 900), .65);
  assert.equal(clampZoom(NaN), 1);
  const { camera } = fixture(); const position = camera.position.clone();
  camera.zoom = zoomAfterWheel(1, -100, 0, 900); camera.updateProjectionMatrix();
  assert.ok(camera.getEffectiveFOV() < 60); assert.ok(position.equals(camera.position));
});
