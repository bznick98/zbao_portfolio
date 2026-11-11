import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/house-viewer/vendor/three/three.module.js';
import { collectWallSurfaces, zoomAfterWheel, clampZoom } from '../public/house-viewer/measurements.js';
import { applySurfaceMaterials } from '../public/house-viewer/finishes.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < .0001, `${actual} ≠ ${expected}`);
function wall(width = 6, height = 3) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, .2), new THREE.MeshStandardMaterial());
  mesh.name = 'wall'; mesh.userData.layer = 'Walls'; return mesh;
}
test('dimensions attach to actual broad wall faces and omit thin edges', () => {
  const mesh = wall(); mesh.position.set(4, 1.5, -2);
  const faces = collectWallSurfaces(mesh); assert.equal(faces.length, 2);
  for (const face of faces) {
    near(face.width, 6); near(face.height, 3); near(face.origin[1], 0);
    near(face.origin[2], -2 + face.normal[2] * .1);
    near(new THREE.Vector3(...face.right).cross(new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(...face.normal)), 1);
  }
});
test('rotated and scaled walls keep true surface dimensions instead of world bounding-box extents', () => {
  const root = new THREE.Group(), mesh = wall(); root.add(mesh);
  root.rotation.y = Math.PI / 6; root.scale.set(1.5, 1, 1); root.position.set(2, 0, -4);
  const faces = collectWallSurfaces(root); assert.equal(faces.length, 2);
  for (const face of faces) { near(face.width, 9); near(face.height, 3); }
});
test('gapped faces, lintels, skirting and non-wall objects do not invent wall spans', () => {
  const root = new THREE.Group();
  const left = wall(2), right = wall(2); left.position.x = -2; right.position.x = 2;
  const geometries = [left, right].map(mesh => { mesh.updateMatrixWorld(); return mesh.geometry.toNonIndexed().applyMatrix4(mesh.matrixWorld); });
  const joined = new THREE.BufferGeometry();
  joined.setAttribute('position', new THREE.Float32BufferAttribute(geometries.flatMap(g => [...g.attributes.position.array]), 3));
  const disconnected = new THREE.Mesh(joined); disconnected.userData.layer = 'Walls'; root.add(disconnected);
  root.add(wall(6, .4)); const furniture = wall(); furniture.userData.layer = 'Joinery'; root.add(furniture);
  assert.deepEqual(collectWallSurfaces(root), []);
});
test('wheel zoom respects units and limits without moving the camera', () => {
  near(zoomAfterWheel(1, -32, 0, 900), zoomAfterWheel(1, -2, 1, 900));
  assert.equal(zoomAfterWheel(3, -1000, 0, 900), 3); assert.equal(zoomAfterWheel(.65, 1000, 2, 900), .65);
  assert.equal(clampZoom(NaN), 1);
  const camera = new THREE.PerspectiveCamera(60); const position = camera.position.clone();
  camera.zoom = zoomAfterWheel(1, -100, 0, 900); camera.updateProjectionMatrix();
  assert.ok(camera.getEffectiveFOV() < 60); assert.ok(position.equals(camera.position));
});
test('clay finishes separate walls, ceiling, wood and metal while retaining source glass and teak', () => {
  const root = new THREE.Group(), clay = new THREE.MeshStandardMaterial({ name: 'V9_White_Clay', color: '#bbb' });
  const items = [['W01_0','Walls'],['CEILING_MAIN','Ceilings'],['F01_mullion_0','Windows'],['W03_leaf_0','Doors']].map(([name, layer]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), clay); mesh.name = name; mesh.userData.layer = layer; root.add(mesh); return mesh;
  });
  const glass = new THREE.MeshStandardMaterial({ name: 'Window_Glass', transparent: true, opacity: .12 });
  const teak = new THREE.MeshStandardMaterial({ name: 'Floor_Teak_Oiled' });
  const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(), glass), floor = new THREE.Mesh(new THREE.BoxGeometry(), teak); root.add(glassMesh, floor);
  const finish = applySurfaceMaterials(root);
  assert.equal(new Set(items.map(mesh => mesh.material.color.getHexString())).size, 4);
  assert.equal(clay.color.getHexString(), 'bbbbbb');
  assert.equal(glassMesh.material, glass); assert.equal(floor.material, teak);
  assert.ok(items[3].material.map && items[3].material.bumpMap); assert.ok(items[2].material.metalness > .5);
  finish.dispose();
});
