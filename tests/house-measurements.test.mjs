import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/house-viewer/vendor/three/three.module.js';
import { collectWallSurfaces, zoomAfterWheel, clampZoom } from '../public/house-viewer/measurements.js';


const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < .0001, `${actual} ≠ ${expected}`);
function wall(width = 6, height = 3) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, .2), new THREE.MeshStandardMaterial());
  mesh.name = 'wall'; mesh.userData.layer = 'Walls'; return mesh;
}
test('dimensions include all eligible vertical faces, including thin returns', () => {
  const mesh = wall(); mesh.position.set(4, 1.5, -2);
  const faces = collectWallSurfaces(mesh); assert.equal(faces.length, 4);
  for (const face of faces.filter(face=>face.width>1)) {
    near(face.width, 6); near(face.height, 3); near(face.origin[1], 0);
    near(face.origin[2], -2 + face.normal[2] * .1);
    near(new THREE.Vector3(...face.right).cross(new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(...face.normal)), 1);
  }
});
test('rotated and scaled walls keep true surface dimensions instead of world bounding-box extents', () => {
  const root = new THREE.Group(), mesh = wall(); root.add(mesh);
  root.rotation.y = Math.PI / 6; root.scale.set(1.5, 1, 1); root.position.set(2, 0, -4);
  const faces = collectWallSurfaces(root); assert.equal(faces.length, 4);
  for (const face of faces.filter(face=>face.width>1)) { near(face.width, 9); near(face.height, 3); }
});
test('disconnected faces and lintels remain separately measured', () => {
  const root = new THREE.Group();
  const left = wall(2), right = wall(2); left.position.x = -2; right.position.x = 2;
  const geometries = [left, right].map(mesh => { mesh.updateMatrixWorld(); return mesh.geometry.toNonIndexed().applyMatrix4(mesh.matrixWorld); });
  const joined = new THREE.BufferGeometry();
  joined.setAttribute('position', new THREE.Float32BufferAttribute(geometries.flatMap(g => [...g.attributes.position.array]), 3));
  const disconnected = new THREE.Mesh(joined); disconnected.name='disconnected'; disconnected.userData.layer = 'Walls'; root.add(disconnected);
  root.add(wall(6, .4)); const furniture = wall(); furniture.userData.layer = 'Joinery'; root.add(furniture);
  const faces=collectWallSurfaces(root);assert.equal(faces.length,12);assert.ok(faces.some(f=>f.height===.4));assert.ok(!faces.some(f=>f.width===6&&f.height===3));
});
test('wheel zoom respects units and limits without moving the camera', () => {
  near(zoomAfterWheel(1, -32, 0, 900), zoomAfterWheel(1, -2, 1, 900));
  assert.equal(zoomAfterWheel(3, -1000, 0, 900), 3); assert.equal(zoomAfterWheel(.65, 1000, 2, 900), .65);
  assert.equal(clampZoom(NaN), 1);
  const camera = new THREE.PerspectiveCamera(60); const position = camera.position.clone();
  camera.zoom = zoomAfterWheel(1, -100, 0, 900); camera.updateProjectionMatrix();
  assert.ok(camera.getEffectiveFOV() < 60); assert.ok(position.equals(camera.position));
});
test('website importer preserves revision materials instead of repainting designs',async()=>{
  const {readFile}=await import('node:fs/promises');
  const main=await readFile(new URL('../public/house-viewer/main.js',import.meta.url),'utf8');
  assert.equal(main.includes('applyHouseFinishes'),false);
  const provenance=JSON.parse(await readFile(new URL('../public/house-viewer/provenance.json',import.meta.url),'utf8'));assert.equal(provenance.sourceMaterialsPreserved,true);
});

test('wall dimensions have separate numeric axes at fixed line midpoints',async()=>{
 const {buildWallDimensionSpecs}=await import('../public/house-viewer/dimension-layout.js');
 const faces=collectWallSurfaces(wall()),specs=buildWallDimensionSpecs(faces);
 assert.equal(specs.length,faces.length*2);assert.deepEqual(specs,buildWallDimensionSpecs([...faces].reverse()));
 for(const spec of specs){
  assert.match(spec.text,/^\d+$/);const face=faces.find(f=>f.id===spec.faceId);assert.equal(spec.valueMm,Math.round(face[spec.axis]*1000));
  for(let i=0;i<3;i++)near(spec.center[i],(spec.a[i]+spec.b[i])/2);
  near(Math.hypot(...spec.a.map((n,i)=>n-spec.b[i])),face[spec.axis]);
 }
});
