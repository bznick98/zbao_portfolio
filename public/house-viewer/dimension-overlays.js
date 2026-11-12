import * as THREE from 'three';
import { buildWallSurfaceManifest } from './wall-surfaces.js';
import { createWallLabels } from './wall-labels.js';
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
  label(text, center, right, up, height = .18, width) {
    this.labels.push({ text, center, right, up, height, width });
  }
  build(name) {
    const group = new THREE.Group(); group.name = name;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.lines, 3));
    const material = new THREE.LineBasicMaterial({ color: '#24353e', depthTest: this.depthTest, depthWrite: false, toneMapped: false });
    const lines = new THREE.LineSegments(geometry, material); lines.renderOrder = 200; group.add(lines);
    const texts = [...new Set(this.labels.map(label => label.text))];
    const canvas = document.createElement('canvas'), cellWidth = 320, cellHeight = 96, columns = 4;
    canvas.width = cellWidth * columns; canvas.height = Math.max(1, Math.ceil(texts.length / columns)) * cellHeight;
    const ctx = canvas.getContext('2d'), entries = new Map();
    for (const [i, text] of texts.entries()) {
      const x = i % columns * cellWidth, y = Math.floor(i / columns) * cellHeight;
      ctx.font = '500 64px Arial, sans-serif';
      const width = Math.min(cellWidth,Math.ceil(ctx.measureText(text).width)+28);
      if(!this.depthTest){ctx.fillStyle='rgba(250,250,246,.96)';ctx.fillRect(x+3,y+3,width-6,cellHeight-6);}
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if(this.depthTest){ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=3;ctx.strokeText(text,x+width/2,y+cellHeight/2,width-24);}
      ctx.fillText(text, x + width / 2, y + cellHeight / 2, width - 24);
      entries.set(text, [x / canvas.width, 1 - (y + cellHeight) / canvas.height, (x + width) / canvas.width, 1 - y / canvas.height, width / cellHeight]);
    }
    const positions = [], uv = [];
    for (const label of this.labels) for (const [x, y] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]) {
      const rect = entries.get(label.text);
      const p = label.center.clone().addScaledVector(label.right, (x - .5) * (label.width ?? label.height * rect[4])).addScaledVector(label.up, (y - .5) * label.height);
      positions.push(...p.toArray());
      uv.push(THREE.MathUtils.lerp(rect[0], rect[2], x), THREE.MathUtils.lerp(rect[1], rect[3], y));
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    const labelsGeometry = new THREE.BufferGeometry();
    labelsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    labelsGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // Freeze full bounds before compacting visible ranges; later views can reveal any axis.
    geometry.computeBoundingSphere();labelsGeometry.computeBoundingSphere();
    const labels = new THREE.Mesh(labelsGeometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .1, depthTest: this.depthTest, depthWrite: false, toneMapped: false, side: THREE.FrontSide }));
    labels.renderOrder = 201; group.add(labels); group.visible = false;
    const allLines=this.lines;
    return { group, setVisibleRanges(ranges) {
      const selectedLines=ranges.flatMap(r=>allLines.slice(r.start,r.end)),selectedPositions=ranges.flatMap(r=>positions.slice(r.label*18,r.label*18+18)),selectedUv=ranges.flatMap(r=>uv.slice(r.label*12,r.label*12+12));
      for(const [attribute,values] of [[geometry.attributes.position,selectedLines],[labelsGeometry.attributes.position,selectedPositions],[labelsGeometry.attributes.uv,selectedUv]]){attribute.array.set(values);attribute.needsUpdate=true;}
      geometry.setDrawRange(0,selectedLines.length/3);labelsGeometry.setDrawRange(0,selectedPositions.length/3);
    }, segmentCount: this.lines.length / 6, labelCount: this.labels.length,
      dispose() { geometry.dispose(); material.dispose(); labelsGeometry.dispose(); labels.material.dispose(); texture.dispose(); } };
  }
}

export function createDimensionOverlays(root, plan, manifest) {
  const measured=manifest||buildWallSurfaceManifest(root),surfaces=measured.surfaces,specs=buildWallDimensionSpecs(surfaces),wallLabels=createWallLabels(surfaces,specs);
  const wallDraft=new Draft(true),planDraft=new Draft(false),ranges=new Map();
  for(const spec of specs){
    const start=wallDraft.lines.length,label=wallDraft.labels.length;
    for(const pair of spec.lines)wallDraft.line(...pair.map(vector));
    wallDraft.label(spec.text,vector(spec.center),vector(spec.right),vector(spec.up),spec.textHeight,spec.textWidth);
    ranges.set(spec.id,{start,end:wallDraft.lines.length,label});
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
  const walls = wallDraft.build('Model wall dimensions (mm)'), drawing = planDraft.build('PDF plan dimensions (mm)');
  walls.setVisibleRanges([]);
  let visibleKey='',lastLabelState;
  return { walls, drawing, surfaces, plan, manifest:measured, wallLabels,
    update(camera,activeRoot,now) {
      wallLabels.update(camera,activeRoot,walls.group.visible,now);
      const labelState=wallLabels.getState();if(labelState===lastLabelState)return;lastLabelState=labelState;
      const ids=labelState.visible.map(f=>f.id),key=ids.join('|');
      if(key!==visibleKey){visibleKey=key;walls.setVisibleRanges(ids.map(id=>ranges.get(id)));}
    },
    dispose() { walls.dispose(); drawing.dispose(); wallLabels.dispose(); } };
}
