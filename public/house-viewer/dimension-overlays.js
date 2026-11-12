import * as THREE from 'three';
import { buildWallSurfaceManifest } from './wall-surfaces.js';
import { createDimensionTextAtlas } from './dimension-text.js';
import { buildWallDimensionSpecs } from './dimension-layout.js';

const vector = a => new THREE.Vector3(...a);
// Static CAD-style linework: no camera tracking or measurement in the render loop.
class Draft {
  constructor(depthTest) { this.depthTest = depthTest; this.lines = []; this.labels = []; }
  line(a, b) { this.lines.push(...a.toArray(), ...b.toArray()); }
  tick(p, direction, perpendicular, size = .055) {
    const offset = direction.clone().add(perpendicular).multiplyScalar(size);
    this.line(p.clone().sub(offset), p.clone().add(offset));
  }
  label(text, center, right, up, height = .18) {
    this.labels.push({ text, center, right, up, height });
  }
  build(name, atlas=createDimensionTextAtlas(this.labels.map(label=>label.text),!this.depthTest)) {
    const group = new THREE.Group(); group.name = name;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.lines, 3));
    const material = new THREE.LineBasicMaterial({ color: '#24353e', depthTest: this.depthTest, depthWrite: false, toneMapped: false });
    const lines = new THREE.LineSegments(geometry, material); lines.renderOrder = 200; group.add(lines);
    const positions = [], uv = [];
    for (const label of this.labels) for (const [x, y] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]) {
      const entry=atlas.entries.get(label.text),rect=entry.uv;
      const p = label.center.clone().addScaledVector(label.right, (x - .5) * (label.height * entry.aspect)).addScaledVector(label.up, (y - .5) * label.height);
      positions.push(...p.toArray());
      uv.push(THREE.MathUtils.lerp(rect[0], rect[2], x), THREE.MathUtils.lerp(rect[1], rect[3], y));
    }
    const texture=atlas.texture;
    const labelsGeometry = new THREE.BufferGeometry();
    labelsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    labelsGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // Immutable buffers and full bounds are shared by every camera pose.
    geometry.computeBoundingSphere();labelsGeometry.computeBoundingSphere();
    const labels = new THREE.Mesh(labelsGeometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .1, depthTest: this.depthTest, depthWrite: false, toneMapped: false, side: THREE.FrontSide }));
    labels.renderOrder = 201; group.add(labels); group.visible = false;
    geometry.setDrawRange(0,this.lines.length/3);labelsGeometry.setDrawRange(0,positions.length/3);
    return { group, segmentCount:this.lines.length/6,labelCount:this.labels.length,
      geometryVersions:()=>[geometry.attributes.position.version,labelsGeometry.attributes.position.version,labelsGeometry.attributes.uv.version],
      dispose() { geometry.dispose(); material.dispose(); labelsGeometry.dispose(); labels.material.dispose(); texture.dispose(); } };
  }
}

export function createDimensionOverlays(root, plan, manifest) {
  const measured=manifest||buildWallSurfaceManifest(root),surfaces=measured.surfaces;
  const atlas=createDimensionTextAtlas(surfaces.flatMap(face=>[String(Math.round(face.width*1000)),String(Math.round(face.height*1000))]));
  const specs=buildWallDimensionSpecs(surfaces,atlas.aspect);
  const wallDraft=new Draft(true),planDraft=new Draft(false);
  for(const spec of specs){
    for(const pair of spec.lines)wallDraft.line(...pair.map(vector));
    wallDraft.label(spec.text,vector(spec.center),vector(spec.right),vector(spec.up),spec.textHeight);
  }
  for (const dimension of plan?.dimensions || []) {
    const a = vector(dimension.a), b = vector(dimension.b);
    let right = b.clone().sub(a).normalize();
    if (right.x < -.01 || Math.abs(right.x)<.01 && right.z>0) right.negate();
    const up = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),right);
    planDraft.line(a,b);
    for (const line of dimension.extensions) planDraft.line(...line.map(vector));
    for (const end of [a,b]) {
      planDraft.tick(end,right,up,.055);
      if (!dimension.extensions.length) planDraft.line(end.clone().addScaledVector(up,-.10),end.clone().addScaledVector(up,.10));
    }
    const height = dimension.kind==='axis' ? .5 : Math.min(.32,Math.max(.14,a.distanceTo(b)*.22));
    // Separate nested axis chains without moving their measured endpoints.
    const side = ['D04','D06','D07','D08'].includes(dimension.id) ? -1 : 1;
    const center = a.clone().add(b).multiplyScalar(.5).addScaledVector(up,side*height*.75);
    planDraft.label(String(dimension.valueMm),center,right,up,height);
  }
  const walls=wallDraft.build('Model wall dimensions (mm)',atlas),drawing=planDraft.build('PDF plan dimensions (mm)');
  // Every axis stays in the GPU buffers. Depth, front-face and frustum clipping
  // work per fragment; no camera-dependent suppression or buffer compaction.
  const wallLabels={getState:()=>({generatedFaces:surfaces.length,generatedDimensions:specs.length,
    enabled:walls.group.visible,submittedDimensions:walls.group.visible?specs.length:0,
    placement:'static-gpu-depth',items:specs,geometryVersions:walls.geometryVersions()})};
  return {walls,drawing,surfaces,plan,manifest:measured,wallLabels,
    update(){},
    dispose(){walls.dispose();drawing.dispose();}};
}
