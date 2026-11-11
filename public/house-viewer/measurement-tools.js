import * as THREE from 'three';
import { createDimensionOverlays } from './dimension-overlays.js';
import { distanceMeters, pickSurface } from './measurement-geometry.js';
import { setText } from './i18n.js';

export function installMeasurementTools({ root, scene, renderer, modes, plan, clearWalkInput }) {
  const $ = id => document.getElementById(id), canvas = renderer.domElement;
  const dimensionsButton = $('dimensions-toggle'), rulerButton = $('measure-toggle');
  let dimensions = false, measuring = false, annotations, points = [], preview = null, gesture = false;
  const pointers = new Map();
  const group = new THREE.Group(); group.name = 'Two-point ruler'; group.visible = false; scene.add(group);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6),3));
  const line = new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#b65e16',depthTest:false,depthWrite:false,toneMapped:false}));
  line.renderOrder = 1100; line.frustumCulled = false; group.add(line);
  const markerGeometry = new THREE.SphereGeometry(.035,12,8), markerMaterial = new THREE.MeshBasicMaterial({color:'#e49b32',depthTest:false,depthWrite:false,toneMapped:false});
  const markers = [0,1].map(() => { const marker = new THREE.Mesh(markerGeometry,markerMaterial); marker.renderOrder=1101; group.add(marker); return marker; });
  const labelCanvas = document.createElement('canvas'); labelCanvas.width=512; labelCanvas.height=128;
  const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false,sizeAttenuation:false}));
  label.scale.set(.105,.026,1); label.center.set(.5,-.15); label.renderOrder=1102; group.add(label);

  function hint(key) { setText($('measure-hint'),key); }
  function redraw() {
    const pair = points.length===2 ? points : points.length===1 && preview ? [points[0],preview] : null;
    group.visible = measuring;
    markers.forEach((marker,index) => { const p = (pair||points)[index]; marker.visible=Boolean(p); if(p) marker.position.fromArray(p); });
    line.visible=label.visible=Boolean(pair);
    if (!pair) { $('measure-value').textContent=''; return; }
    geometry.attributes.position.array.set(pair.flat()); geometry.attributes.position.needsUpdate=true;
    label.position.fromArray(pair[0]).add(new THREE.Vector3(...pair[1])).multiplyScalar(.5);
    const value=`${Math.round(distanceMeters(...pair)*1000).toLocaleString('en-US')} mm`;
    $('measure-value').textContent=value;
    const ctx=labelCanvas.getContext('2d'); ctx.clearRect(0,0,512,128); ctx.fillStyle='#fafaf6';ctx.fillRect(0,0,512,128);
    ctx.strokeStyle='#b65e16';ctx.lineWidth=6;ctx.strokeRect(3,3,506,122);
    ctx.fillStyle='#000000';ctx.font='500 64px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,256,64,480);texture.needsUpdate=true;
  }
  function clear() { points=[]; preview=null; hint('measureFirst'); redraw(); }
  function setMeasuring(value) {
    pointers.clear();gesture=false;
    measuring=Boolean(value); rulerButton.setAttribute('aria-pressed',String(measuring)); $('measure-panel').hidden=!measuring;
    if (measuring) { clearWalkInput(); if(document.pointerLockElement) document.exitPointerLock(); }
    clear();
  }
  function syncDimensions() {
    if (annotations) {
      annotations.walls.group.visible=dimensions && (modes.mode==='walk'||!plan?.dimensions.length);
      annotations.drawing.group.visible=dimensions && modes.mode==='model' && Boolean(plan?.dimensions.length);
    }
    $('dimensions-note').hidden=!dimensions;
    setText($('dimensions-note'),modes.mode==='model'&&plan?.dimensions.length?'planDimensionsNote':'wallDimensionsNote');
    dimensionsButton.setAttribute('aria-pressed',String(dimensions));
  }
  function setDimensions(value) {
    dimensions=Boolean(value);
    if(dimensions&&!annotations) { annotations=createDimensionOverlays(root,plan);scene.add(annotations.walls.group,annotations.drawing.group); }
    syncDimensions();
  }
  function pickAt(clientX,clientY) {
    const box=canvas.getBoundingClientRect();
    return pickSurface(modes.activeRoot,modes.camera,new THREE.Vector2((clientX-box.left)/box.width*2-1,-(clientY-box.top)/box.height*2+1));
  }
  function select(point) {
    if(points.length===2) points=[];
    if(points.length && distanceMeters(points[0],point)<.001) { hint('measureDifferent');return; }
    points.push([...point]);preview=null;hint(points.length===1?'measureSecond':'measureDone');redraw();
  }
  function down(event) {
    if(!measuring || event.button!==0) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,moved:false});
    if(pointers.size>1) gesture=true;
  }
  function move(event) {
    const pointer=pointers.get(event.pointerId);
    if(pointer && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>6) pointer.moved=true;
    if(measuring && points.length===1 && event.pointerType==='mouse' && !event.buttons) {
      preview=pickAt(event.clientX,event.clientY)?.point || null;redraw();
    }
  }
  function up(event) {
    const pointer=pointers.get(event.pointerId);pointers.delete(event.pointerId);
    if(measuring && pointer && !pointer.moved && !gesture) {
      const hit=pickAt(event.clientX,event.clientY);
      if(hit) select(hit.point); else hint('measureSurface');
    }
    if(!pointers.size) gesture=false;
  }
  function cancel() { pointers.clear();gesture=false;preview=null;redraw(); }
  function key(event) { if(event.key==='Escape'&&measuring&&$('settings').hidden)setMeasuring(false); }
  dimensionsButton.disabled=rulerButton.disabled=false;
  dimensionsButton.onclick=()=>setDimensions(!dimensions);rulerButton.onclick=()=>setMeasuring(!measuring);$('measure-clear').onclick=clear;
  canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointercancel',cancel,true);
  window.addEventListener('blur',cancel);document.addEventListener('keydown',key);
  const unsubscribe=modes.subscribe(()=>{cancel();syncDimensions();});
  return { setDimensions, setMeasuring, pickAt,
    getState:()=>({dimensions,dimensionsVisible:Boolean(annotations?.walls.group.visible||annotations?.drawing.group.visible),
      wallDimensionsVisible:Boolean(annotations?.walls.group.visible),planDimensionsVisible:Boolean(annotations?.drawing.group.visible),
      annotationMeshes:annotations?.walls.group.children.length||0,measurements:annotations?.surfaces.map(face=>({...face}))||[],
      planDimensions:plan?.dimensions||[],planSource:plan?.sourceDrawing||null,
      ruler:{enabled:measuring,points:points.map(p=>[...p]),distanceMeters:points.length===2?distanceMeters(...points):null,
        line:points.length===2?[...geometry.attributes.position.array]:[],projected:points.map(p=>new THREE.Vector3(...p).project(modes.camera).toArray())}}),
    dispose() { unsubscribe();canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);document.removeEventListener('keydown',key);annotations?.dispose();if(annotations)scene.remove(annotations.walls.group,annotations.drawing.group);geometry.dispose();line.material.dispose();markerGeometry.dispose();markerMaterial.dispose();label.material.dispose();texture.dispose();scene.remove(group); },
  };
}
