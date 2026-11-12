import * as THREE from 'three';
import {setText} from './i18n.js';
import {createDimensionOcclusion} from './dimension-occlusion.js';
export function intersects(a,b,gap=5){return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;}
// Stable screen packing only affects display. It never changes the measured geometry.
export function placeWallLabels(candidates,width,height,blocked=[]){
 const placed=[],hidden=[];const shifts=[[0,0],[0,-40],[0,40],[-112,0],[112,0],[-112,-40],[112,-40],[-112,40],[112,40],[0,-80],[0,80],[-224,0],[224,0]];
 for(const item of [...candidates].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id,'en'))){
  let result;
  for(const anchor of item.anchors){for(const [dx,dy] of shifts){
   const box={x:Math.round(anchor.x-item.width/2+dx),y:Math.round(anchor.y-item.height/2+dy),width:item.width,height:item.height};
   if(box.x<8||box.y<8||box.x+box.width>width-8||box.y+box.height>height-8)continue;
   if(blocked.some(other=>intersects(box,other))||placed.some(other=>intersects(box,other.box)))continue;
   result={...item,anchor,box};break;
  }if(result)break;}
  if(result)placed.push(result);else hidden.push({id:item.id,reason:'screen crowding'});
 }
 return {placed,hidden};
}

export function createWallLabels(surfaces){
 const container=document.createElement('div');container.className='wall-label-layer';container.hidden=true;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('wall-label-leaders');container.append(svg);
 const elements=new Map();
 for(const face of surfaces){
  const el=document.createElement('div');el.className='wall-dimension-label';el.dataset.faceId=face.id;el.hidden=true;
  el.dataset.widthMm=String(Math.round(face.width*1000));el.dataset.heightMm=String(Math.round(face.height*1000));
  const values={width:Math.round(face.width*1000).toLocaleString('en-US'),height:Math.round(face.height*1000).toLocaleString('en-US')},row=document.createElement('span');setText(row,'dimensionFace',values);el.append(row);
  const labelWidth=Math.max(76,Math.ceil((values.width.length+values.height.length+3)*6.8+16));el.style.width=labelWidth+'px';
  const line=document.createElementNS(svg.namespaceURI,'line');line.hidden=true;svg.append(line);container.append(el);elements.set(face.id,{el,line,width:labelWidth});
 }
 document.body.append(container);
 const prepared=surfaces.map(face=>({...face,occluders:[],normalVector:new THREE.Vector3(...face.normal),center:new THREE.Vector3(...face.anchors[0]),worldAnchors:face.anchors.map(p=>new THREE.Vector3(...p).addScaledVector(new THREE.Vector3(...face.normal),.012))}));
 let signature='',lastTime=-Infinity,activeRoot,occlusion,state={generatedFaces:surfaces.length,visible:[],hidden:[]},shown=new Set();
 let blockers=[],blockersDirty=true;
 const blockerSelector='.common-tools,.view-controls,.nav,#settings,#revision-status,#tool-readout,.map,#joystick,#model-tools';
 const invalidate=()=>{blockersDirty=true;};
 const observer=new MutationObserver(invalidate),resizeObserver=new ResizeObserver(invalidate);
 for(const el of document.querySelectorAll(blockerSelector)){
  observer.observe(el,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden','class','aria-expanded']});resizeObserver.observe(el);
 }
 addEventListener('resize',invalidate);
 const ray=new THREE.Raycaster(),tmp=new THREE.Vector3(),direction=new THREE.Vector3(),cameraPosition=new THREE.Vector3();
 function update(camera,root,enabled,now=performance.now()){
  if(container.hidden===enabled)container.hidden=!enabled;
  if(!enabled){signature='';return;}
  // No DOM layout reads or ray work on skipped animation frames.
  if(now-lastTime<85&&root===activeRoot)return;
  camera.updateMatrixWorld(true);const width=innerWidth,height=innerHeight;
  const next=camera.matrixWorld.elements.concat(camera.projectionMatrix.elements).join(',')+width+':'+height;
  if(next===signature&&root===activeRoot&&!blockersDirty)return;
  lastTime=now;signature=next;
  if(blockersDirty){
   blockers=[...document.querySelectorAll(blockerSelector)].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});blockersDirty=false;
  }
  if(root!==activeRoot){activeRoot=root;occlusion=createDimensionOcclusion(root);for(const face of prepared)face.occluders=[];}
  cameraPosition.setFromMatrixPosition(camera.matrixWorld);const candidates=[],reasons=[];
  const projectionScale=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  for(const face of prepared){
   const normal=face.normalVector,center=face.center;
   if(direction.copy(cameraPosition).sub(center).normalize().dot(normal)<.08){reasons.push({id:face.id,reason:'back facing'});continue;}
   const anchors=[];let inFrame=false;
   for(let index=0;index<face.worldAnchors.length;index++){
    const world=face.worldAnchors[index];
    const distance=world.distanceTo(cameraPosition),projected=tmp.copy(world).project(camera);
    if(projected.z< -1||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1)continue;
    inFrame=true;const pixelsPerMeter=projectionScale/Math.max(distance,.1);
    if(Math.min(face.width,face.height)*pixelsPerMeter<5)continue;
    ray.set(cameraPosition,direction.copy(world).sub(cameraPosition).normalize());ray.near=.025;ray.far=Math.max(.025,distance-.03);
    face.occluders[index]=occlusion.blockingMesh(ray,face.occluders[index]);
    if(face.occluders[index])continue;
    anchors.push({x:(projected.x*.5+.5)*width,y:(.5-projected.y*.5)*height,world:world.toArray()});
    if(anchors.length===3)break;
   }
   if(!anchors.length){reasons.push({id:face.id,reason:inFrame?'occluded or subpixel':'outside view'});continue;}
   candidates.push({id:face.id,anchors,width:elements.get(face.id).width,height:24,priority:face.area/Math.max(1,center.distanceToSquared(cameraPosition))});
  }
  const layout=placeWallLabels(candidates,width,height,blockers);
  const nextShown=new Set(layout.placed.map(p=>p.id));
  for(const id of shown)if(!nextShown.has(id)){const {el,line}=elements.get(id);el.hidden=true;line.style.display='none';}
  shown=nextShown;
  for(const item of layout.placed){
   const {el,line}=elements.get(item.id);if(el.hidden)el.hidden=false;el.style.transform=`translate(${item.box.x}px,${item.box.y}px)`;
   const end={x:Math.max(item.box.x,Math.min(item.anchor.x,item.box.x+item.box.width)),y:Math.max(item.box.y,Math.min(item.anchor.y,item.box.y+item.box.height))};
   if(Math.hypot(end.x-item.anchor.x,end.y-item.anchor.y)>5){line.style.display='';line.setAttribute('x1',item.anchor.x);line.setAttribute('y1',item.anchor.y);line.setAttribute('x2',end.x);line.setAttribute('y2',end.y);}else line.style.display='none';
  }
  state={generatedFaces:surfaces.length,visible:layout.placed.map(p=>({id:p.id,box:p.box,anchor:p.anchor})),hidden:[...reasons,...layout.hidden],camera:cameraPosition.toArray(),occlusion:occlusion.getStats()};
 }
 return {update,getState:()=>state,dispose(){observer.disconnect();resizeObserver.disconnect();removeEventListener('resize',invalidate);container.remove();}};
}
