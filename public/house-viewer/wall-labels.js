import * as THREE from 'three';
import {createDimensionOcclusion} from './dimension-occlusion.js';
import {buildWallDimensionSpecs,selectWallDimensions} from './dimension-layout.js';
// Visibility only. Numbers and strokes are batched world-space geometry, not DOM.
export function createWallLabels(surfaces,specs=buildWallDimensionSpecs(surfaces)) {
 const prepared=specs.map(spec=>({...spec,normalVector:new THREE.Vector3(...spec.normal),worldCenter:new THREE.Vector3(...spec.center),worldCorners:spec.corners.map(p=>new THREE.Vector3(...p)),worldLines:spec.lines.map(pair=>pair.map(p=>new THREE.Vector3(...p))),occluders:[]}));
 let signature='',activeRoot,occlusion,state={generatedFaces:surfaces.length,generatedDimensions:specs.length,enabled:false,visible:[],hidden:[]},shown=new Set(),blockers=[],blockersDirty=true;
 const selector='.common-tools,.view-controls,.nav,#settings,#revision-status,#tool-readout,.map,#joystick,#model-tools';
 const invalidate=()=>{blockersDirty=true;},observer=new MutationObserver(invalidate),resizeObserver=new ResizeObserver(invalidate);
 for(const el of document.querySelectorAll(selector)){observer.observe(el,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden','class','aria-expanded']});resizeObserver.observe(el);}
 addEventListener('resize',invalidate);
 const ray=new THREE.Raycaster(),tmp=new THREE.Vector3(),direction=new THREE.Vector3(),cameraPosition=new THREE.Vector3();
 function update(camera,root,enabled){
  if(!enabled){if(state.enabled)state={...state,enabled:false,visible:[]};signature='';return;}
  camera.updateMatrixWorld(true);const width=innerWidth,height=innerHeight,next=camera.matrixWorld.elements.concat(camera.projectionMatrix.elements).join(',')+width+':'+height;
  if(next===signature&&root===activeRoot&&!blockersDirty)return;signature=next;
  if(blockersDirty){blockers=[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});blockersDirty=false;}
  if(root!==activeRoot){activeRoot=root;occlusion=createDimensionOcclusion(root);for(const spec of prepared)spec.occluders=[];shown.clear();}
  cameraPosition.setFromMatrixPosition(camera.matrixWorld);
  const project=world=>{tmp.copy(world).project(camera);return {x:(tmp.x*.5+.5)*width,y:(.5-tmp.y*.5)*height,z:tmp.z};};
  const candidates=[],reasons=[];
  for(const spec of prepared){
   if(direction.copy(cameraPosition).sub(spec.worldCenter).normalize().dot(spec.normalVector)<.18){reasons.push({id:spec.id,reason:'back facing or grazing'});continue;}
   const corners=spec.worldCorners.map(project),segments=spec.worldLines.map(pair=>pair.map(project)),points=[...corners,...segments.flat()];
   if(points.some(p=>p.z< -1||p.z>1||p.x<8||p.y<8||p.x>width-8||p.y>height-8)){reasons.push({id:spec.id,reason:'outside view'});continue;}
   const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
   if(Math.min(distance(corners[0],corners[3]),distance(corners[1],corners[2]))<15||Math.min(distance(corners[0],corners[1]),distance(corners[3],corners[2]))<spec.text.length*7){reasons.push({id:spec.id,reason:'too small to read'});continue;}
   const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),box={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
   const item={id:spec.id,faceId:spec.faceId,axis:spec.axis,valueMm:spec.valueMm,text:spec.text,priority:spec.priority,box,corners,segments,worldCenter:spec.center,worldCorners:spec.corners};
   const ui=selectWallDimensions([item],width,height,blockers);if(!ui.placed.length){reasons.push(...ui.hidden);continue;}
   const probes=[spec.worldCenter,...spec.worldCorners,...spec.worldLines.flat(),...spec.worldLines.slice(0,2).map(([a,b])=>a.clone().lerp(b,.5))];let hidden=false;
   for(let i=0;i<probes.length;i++){const world=probes[i],distance=world.distanceTo(cameraPosition);ray.set(cameraPosition,direction.copy(world).sub(cameraPosition).normalize());ray.near=.025;ray.far=Math.max(.025,distance-.018);spec.occluders[i]=occlusion.blockingMesh(ray,spec.occluders[i]);if(spec.occluders[i]){hidden=true;break;}}
   if(hidden)reasons.push({id:spec.id,reason:'occluded'});else candidates.push(item);
  }
  const layout=selectWallDimensions(candidates,width,height,[],shown);shown=new Set(layout.placed.map(p=>p.id));
  state={generatedFaces:surfaces.length,generatedDimensions:specs.length,enabled:true,placement:'fixed-world-line-midpoints',visible:layout.placed,hidden:[...reasons,...layout.hidden],camera:cameraPosition.toArray(),occlusion:occlusion.getStats()};
 }
 return {update,getState:()=>state,dispose(){observer.disconnect();resizeObserver.disconnect();removeEventListener('resize',invalidate);}};
}
