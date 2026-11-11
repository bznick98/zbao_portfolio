import * as THREE from './vendor/three/three.module.js';
import { collectWallSurfaces } from './measurements.js';

// Two static meshes: all witness lines, and an atlas of wall-aligned labels.
// Front faces + the normal depth buffer keep annotations on their own wall.
export function createWallAnnotations(root) {
  const surfaces = collectWallSurfaces(root);
  const group = new THREE.Group(); group.name = 'House wall dimensions'; group.visible = false;
  const labels = [...new Set(surfaces.flatMap(face => [`墙段 ${face.width.toFixed(2)} m`, `墙高 ${face.height.toFixed(2)} m`]))];
  const cellWidth = 384, cellHeight = 96, columns = 4;
  const canvas = document.createElement('canvas');
  canvas.width = cellWidth * columns; canvas.height = Math.max(1, Math.ceil(labels.length / columns)) * cellHeight;
  const ctx = canvas.getContext('2d');
  const entries = new Map();
  labels.forEach((label, i) => {
    const x = i % columns * cellWidth, y = Math.floor(i / columns) * cellHeight;
    ctx.fillStyle = 'rgba(249,244,230,.96)'; ctx.fillRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6);
    ctx.strokeStyle = '#49321c'; ctx.lineWidth = 3; ctx.strokeRect(x + 5, y + 5, cellWidth - 10, cellHeight - 10);
    ctx.fillStyle = '#17130f'; ctx.font = '600 40px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + cellWidth / 2, y + cellHeight / 2);
    entries.set(label, [(x + 1) / canvas.width, 1 - (y + cellHeight - 1) / canvas.height, (x + cellWidth - 1) / canvas.width, 1 - (y + 1) / canvas.height]);
  });
  const atlas = new THREE.CanvasTexture(canvas); atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  const linePositions = [], labelPositions = [], uvs = [];
  function quad(target, face, x, y, width, height, rotated = false, uv) {
    const origin = new THREE.Vector3(...face.origin).addScaledVector(new THREE.Vector3(...face.normal), .004);
    const right = new THREE.Vector3(...face.right), up = new THREE.Vector3(0, 1, 0);
    const center = origin.addScaledVector(right, x).addScaledVector(up, y);
    const horizontal = rotated ? up : right, vertical = rotated ? right.clone().negate() : up;
    for (const [u, v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]) {
      const point = center.clone().addScaledVector(horizontal, (u - .5) * width).addScaledVector(vertical, (v - .5) * height);
      target.push(...point.toArray());
      if (uv) uvs.push(THREE.MathUtils.lerp(uv[0], uv[2], u), THREE.MathUtils.lerp(uv[1], uv[3], v));
    }
  }
  for (const face of surfaces) {
    const { width, height } = face, y = Math.min(1.25, height * .46), x = .16;
    quad(linePositions, face, width / 2, y, width, .008);
    quad(linePositions, face, x, height / 2, .008, height);
    for (const end of [.015, width - .015]) quad(linePositions, face, end, y, .008, .10);
    for (const end of [.015, height - .015]) quad(linePositions, face, x, end, .10, .008);
    quad(labelPositions, face, width / 2, y + .16, Math.min(.88, width - .36), .20, false, entries.get(`墙段 ${width.toFixed(2)} m`));
    quad(labelPositions, face, x + .14, height * .70, .72, .18, true, entries.get(`墙高 ${height.toFixed(2)} m`));
  }
  function mesh(positions, material, texcoords) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (texcoords) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const result = new THREE.Mesh(geometry, material);
    result.name = texcoords ? 'Wall dimension labels' : 'Wall dimension lines';
    result.userData.wallAnnotation = true; group.add(result);
  }
  mesh(linePositions, new THREE.MeshBasicMaterial({ color: '#49321c', depthTest: true, depthWrite: false, toneMapped: false, side: THREE.FrontSide }));
  mesh(labelPositions, new THREE.MeshBasicMaterial({ map: atlas, transparent: true, alphaTest: .1, depthTest: true, depthWrite: false, toneMapped: false, side: THREE.FrontSide }), uvs);
  return { group, surfaces, dispose() { group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); atlas.dispose(); } };
}
