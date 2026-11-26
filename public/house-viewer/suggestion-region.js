import * as THREE from 'three';

const rounded = values => Array.from(values, n => +n.toFixed(5));
const xyz = vector => rounded(vector.toArray());
const blender = ([x,y,z]) => [x,-z,y];

function identify(mesh, root) {
  const path = [];
  let owner, layer;
  for (let node = mesh; node && node !== root; node = node.parent) {
    path.unshift({name:node.userData.name || node.name, childIndex:node.parent.children.indexOf(node)});
    if (!owner && (node.userData.source_id || node.userData.stable_id)) owner = node;
    if (!layer && node.userData.layer) layer = node.userData.layer;
  }
  const meta = (owner || mesh).userData;
  const meshKey = path.map(p => p.childIndex).join('/');
  return {
    key:meta.source_id || meta.stable_id || 'node/' + meshKey,
    sourceId:meta.source_id || null, stableId:meta.stable_id || null,
    name:meta.design_label || meta.name || (owner || mesh).name,
    layer:layer || null, roomId:meta.room_id || null, cadEntities:meta.cad_entities || null, path
  };
}

export function modelIdentity(data) {
  const r = data.revision || {};
  return {projectId:data.projectId, revisionId:r.revisionId || null, buildId:data.buildId,
    revisionDigest:r.revisionDigest || null, coordinateFrameId:r.coordinateFrameId || null,
    modelSha256:data.wallDimensions?.modelSha256 || null, geometrySha256:r.geometrySha256 || null};
}

export function sameModel(a,b) {
  return ['projectId','revisionId','buildId','revisionDigest','coordinateFrameId','modelSha256','geometrySha256'].every(k => a[k] === b[k]);
}

function drawPin(ctx,x,y,number,r,cx=x,cy=y-r*1.65,color='#115c4e') {
  // Connect the badge to the precise model hit, even at the edge of a screenshot.
  const direction=Math.atan2(y-cy,x-cx);
  ctx.save();
  ctx.fillStyle=color;ctx.strokeStyle='white';ctx.lineWidth=r*.13;
  ctx.beginPath();
  ctx.moveTo(x,y);ctx.arc(cx,cy,r,direction+.60,direction+2*Math.PI-.60);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='white';ctx.font='bold '+Math.round(r*1.22)+'px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),cx,cy);
  ctx.restore();
}

function markedView(ctx,uv,number,rect,pin=true) {
  ctx.renderFrame();
  const source=ctx.canvas, scale=Math.min(1,960/Math.max(source.width,source.height));
  const image=document.createElement('canvas');
  image.width=Math.max(1,Math.round(source.width*scale));
  image.height=Math.max(1,Math.round(source.height*scale));
  const paint=image.getContext('2d');
  paint.drawImage(source,0,0,image.width,image.height);
  if(rect){
    const box=[rect[0]*image.width,rect[1]*image.height,(rect[2]-rect[0])*image.width,(rect[3]-rect[1])*image.height];
    paint.fillStyle='rgba(16,130,104,.16)';paint.fillRect(...box);
    paint.strokeStyle='#176956';paint.lineWidth=4;paint.strokeRect(...box);
    paint.strokeStyle='white';paint.lineWidth=1;paint.strokeRect(...box);
  }
  if(!pin)return {markerNumber:number,mimeType:'image/jpeg',width:image.width,height:image.height,dataUrl:image.toDataURL('image/jpeg',.83)};
  const x=uv[0]*image.width,y=uv[1]*image.height,r=Math.min(14,image.height*.035);
  const clamp=(n,extent)=>Math.max(r+1,Math.min(extent-r-1,n));
  const cy=y<3*r?y+1.65*r:y-1.65*r;
  drawPin(paint,x,y,number,r,clamp(x,image.width),clamp(cy,image.height));
  return {markerNumber:number,mimeType:'image/jpeg',width:image.width,height:image.height,dataUrl:image.toDataURL('image/jpeg',.83)};
}

function surfaceReader({modes,data,contains},rect) {
  const root=modes.activeRoot,camera=modes.camera;
  root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
  let frustum;
  if(rect){
    const [l,t,r,b]=rect,w=r-l,h=b-t;
    const crop=new THREE.Matrix4().set(1/w,0,0,(1-l-r)/w,0,1/h,0,(t+b-1)/h,0,0,1,0,0,0,0,1);
    frustum=new THREE.Frustum().setFromProjectionMatrix(crop.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse));
  }
  const meshes=[];
  root.traverseVisible(node=>{
    if(node.isMesh && node.layers.test(camera.layers) && (!frustum||frustum.intersectsObject(node)))meshes.push(node);
  });
  const ray=new THREE.Raycaster();
  function first(uv){
    ray.setFromCamera(new THREE.Vector2(2*uv[0]-1,1-2*uv[1]),camera);
    return ray.intersectObjects(meshes,false).find(h=>{
      const mat=h.object.material;
      return (Array.isArray(mat)?mat[h.face?.materialIndex || 0]:mat)?.visible && Math.abs(h.point.clone().project(camera).z)<=1;
    });
  }
  return {first,read(uv){
    const hit=first(uv);
    return hit?describeHit(hit,uv,root,data,contains):null;
  }};
}

export function pickSurface(ctx,uv){return surfaceReader(ctx).read(uv);}

function describeHit(hit,uv,root,data,contains){
  const object=identify(hit.object,root),world=xyz(hit.point);
  const transform=hit.object.matrixWorld.clone();
  if(hit.instanceId!=null) {
    const instance=new THREE.Matrix4();
    hit.object.getMatrixAt(hit.instanceId,instance);transform.multiply(instance);
  }
  const roomId=object.roomId || data.rooms?.find(r=>contains(world[0],-world[2],r.polygon))?.id || null;
  return {world,blender:blender(world),local:xyz(hit.point.clone().applyMatrix4(transform.clone().invert())),
    normalWorld:hit.face?xyz(hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(transform))):null,
    barycentric:hit.barycoord?xyz(hit.barycoord):null,triangle:hit.faceIndex ?? null,instanceId:hit.instanceId ?? null,uv:rounded(uv),roomId,object};
}

function nodeAt(root,path){
  let node=root;
  for(const step of path)node=node?.children[step.childIndex];
  return node;
}

// A multi-material cabinet can be several glTF meshes with the same CAD source.
export function selectObject(ctx,uv){
  const root=ctx.modes.activeRoot,hit=pickSurface(ctx,uv);
  if(!hit)return null;
  const mesh=nodeAt(root,hit.object.path),members=[],bounds=new THREE.Box3();
  const add=part=>{
    const info=identify(part,root),instanceId=part.isInstancedMesh?hit.instanceId:null;
    if(part.isInstancedMesh && (instanceId==null || instanceId>=part.count))return;
    members.push({path:info.path,instanceId});
    if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
    const matrix=part.matrixWorld.clone();
    if(instanceId!=null){const local=new THREE.Matrix4();part.getMatrixAt(instanceId,local);matrix.multiply(local);}
    bounds.union(part.geometry.boundingBox.clone().applyMatrix4(matrix));
  };
  if(hit.object.sourceId || hit.object.stableId){
    root.traverse(part=>{if(part.isMesh && identify(part,root).key===hit.object.key)add(part);});
  }else{
    const group=mesh.parent;
    if(group!==root && group.userData.name && group.userData.layer && group.children.every(part=>part.isMesh))
      group.children.forEach(add);
    else add(mesh);
  }
  return {kind:'model-object',anchor:hit,object:hit.object,members,boundsWorld:{min:xyz(bounds.min),max:xyz(bounds.max)},roomIds:hit.roomId?[hit.roomId]:[]};
}

export function captureObject(ctx,uv,number){
  const region=selectObject(ctx,uv);
  if(!region)return null;
  const preview=pinMarkers(ctx.scene,'Selected object capture');
  try{
    preview.set([{id:'capture',active:true,number,shape:{pins:[],patches:[],members:region.members}}]);
    preview.update(ctx);
    return {...region,view:captureView(ctx),markedView:markedView(ctx,uv,number)};
  }finally{preview.dispose();}
}

export function capturePin(ctx,uv,number) {
  const hit=pickSurface(ctx,uv);
  if(!hit)return null;
  return {...hit,number,view:captureView(ctx),markedView:markedView(ctx,uv,number)};
}
function captureView(ctx){
  const camera=ctx.modes.camera,{mode,walkPose,modelView}=ctx.modes.getState();
  return {mode,walkPose,modelView:mode==='model'?modelView:null,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),
    verticalFovDeg:camera.fov,aspect:camera.aspect,zoom:camera.zoom,projectionMatrix:camera.projectionMatrix.toArray(),matrixWorld:camera.matrixWorld.toArray()};
}

// The room on the open side of a surface: walls lie on room boundaries, so step off along the normal.
function roomBeside(ctx,hit){
  const n=hit.normalWorld||[0,1,0],p=hit.world.map((v,i)=>v+n[i]*.06);
  return ctx.data.rooms?.find(r=>ctx.contains(p[0],-p[2],r.polygon)) || ctx.data.rooms?.find(r=>r.id===hit.roomId) || null;
}
function cleanPolygon(points){
  const out=[];
  for(const [x,y] of points||[]){const last=out.at(-1);if(!last||Math.hypot(x-last[0],y-last[1])>.002)out.push([+x.toFixed(4),+y.toFixed(4)]);}
  if(out.length>2&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<=.002)out.pop();
  return out;
}
const shoelace=poly=>Math.abs(poly.reduce((sum,[x,y],i)=>{const [u,v]=poly[(i+1)%poly.length];return sum+x*v-u*y;},0)/2);
function withPreview(ctx,number,region,uv,pin=true){
  const preview=pinMarkers(ctx.scene,'Suggestion capture');
  try{
    const shape=displayRegion(region);
    preview.set([{id:'capture',active:true,number,shape:{pins:[],patches:shape.patches,members:shape.members||[]}}]);
    preview.update(ctx);
    return {...region,view:captureView(ctx),markedView:markedView(ctx,uv,number,null,pin)};
  }finally{preview.dispose();}
}

// A whole floor, ceiling or wall of one room. Floors and ceilings carry the room outline in plan metres
// (Blender X and Y); a wall carries the wall object that was tapped.
export function captureRoomSurface(ctx,uv,number){
  const hit=pickSurface(ctx,uv);
  if(!hit)return null;
  const room=roomBeside(ctx,hit);
  if(!room)return null;
  const n=hit.normalWorld||[0,1,0],surface=n[1]>.7?'floor':n[1]<-.7?'ceiling':'wall';
  const region={kind:'room-surface',surface,roomId:room.id,roomName:room.name||null,roomIds:[room.id],anchor:hit,heightBlender:hit.blender[2]};
  if(surface==='wall'){
    const chosen=selectObject(ctx,uv);
    Object.assign(region,{object:hit.object,members:chosen?.members||[],boundsWorld:chosen?.boundsWorld||null});
  }else{
    region.polygon=cleanPolygon(room.polygon);region.areaM2=+shoelace(region.polygon).toFixed(3);
  }
  return withPreview(ctx,number,region,uv);
}

// Where something new should go: a box resting on the tapped floor or counter, or against the tapped wall.
export function placementBox(anchor,sizeM){
  const [w,d,h]=sizeM.map(v=>Math.max(.05,Math.min(8,+v||0))),[x,y,z]=anchor.world,n=anchor.normalWorld||[0,1,0];
  let min,max;
  if(Math.abs(n[1])>.7){
    const base=n[1]>0?y:y-h;min=[x-w/2,base,z-d/2];max=[x+w/2,base+h,z+d/2];
  }else if(Math.abs(n[0])>=Math.abs(n[2])){
    const s=Math.sign(n[0])||1;min=[Math.min(x,x+s*d),y-h/2,z-w/2];max=[Math.max(x,x+s*d),y+h/2,z+w/2];
  }else{
    const s=Math.sign(n[2])||1;min=[x-w/2,y-h/2,Math.min(z,z+s*d)];max=[x+w/2,y+h/2,Math.max(z,z+s*d)];
  }
  min=rounded(min);max=rounded(max);
  return {sizeM:[w,d,h],boundsWorld:{min,max},boundsBlender:{min:rounded([min[0],-max[2],min[1]]),max:rounded([max[0],-min[2],max[1]])}};
}
export function capturePlacement(ctx,uv,number,sizeM){
  const hit=pickSurface(ctx,uv);
  if(!hit)return null;
  const room=roomBeside(ctx,hit);
  const region={kind:'placement',anchor:hit,roomIds:room?[room.id]:[],...placementBox(hit,sizeM)};
  return withPreview(ctx,number,region,uv);
}

// A comment on everything in the current view: style, light, mood or anything not tied to one place.
export function captureWholeView(ctx,number){
  const camera=ctx.modes.camera,center=pickSurface(ctx,[.5,.5]);
  const room=ctx.data.rooms?.find(r=>ctx.contains(camera.position.x,-camera.position.z,r.polygon));
  const roomIds=[...new Set([room?.id,center&&roomBeside(ctx,center)?.id].filter(Boolean))];
  return {kind:'view',anchor:center,roomIds,view:captureView(ctx),markedView:markedView(ctx,[.5,.5],number,null,false)};
}

function boxPatch({min,max}){
  const vertices=[],indices=[];
  for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])vertices.push(x,y,z);
  // Corner index = 4*xi + 2*yi + zi.
  for(const f of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])indices.push(f[0],f[1],f[2],f[0],f[2],f[3]);
  return {vertices,indices};
}
function polygonPatch(polygon,heightWorld){
  const contour=polygon.map(([x,y])=>new THREE.Vector2(x,y));
  const faces=THREE.ShapeUtils.triangulateShape(contour,[]);
  // A whole-room overlay stays visual: taps on the floor keep moving the viewer.
  return {vertices:polygon.flatMap(([x,y])=>[x,heightWorld,-y]),indices:faces.flat(),passive:true};
}

// Keep each continuous piece on one modeled surface. Missing geometry and depth
// discontinuities end a segment even when a single mesh contains separate panels.
export function startSurfaceStroke(ctx){
  const reader=surfaceReader(ctx),camera=ctx.modes.camera;
  const {clientWidth:width,clientHeight:height}=ctx.canvas;
  const matrix=camera.matrixWorld.clone(),projection=camera.projectionMatrix.clone(),root=ctx.modes.activeRoot;
  const segments=[],rooms=new Set(),v=new THREE.Vector3(),delta=new THREE.Vector3(),normal=new THREE.Vector3(),other=new THREE.Vector3();
  const footprint=2*Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()/2))/height;
  let segment=null,lastUV=null,count=0,anchor=null;
  function sample(uv){
    const hit=uv.every(n=>n>=0&&n<=1)?reader.read(uv):null;
    if(!hit?.normalWorld){segment=null;return;}
    const {object,instanceId,...point}=hit;
    const depth=-v.fromArray(point.world).applyMatrix4(camera.matrixWorldInverse).z;
    point.radiusMeters=+Math.max(.0001,depth*footprint*3).toFixed(6);
    const meshKey=object.path.map(p=>p.childIndex).join('/')+'@'+instanceId;
    const previous=segment?.points.at(-1);
    let connected=false;
    if(previous && segment.meshKey===meshKey){
      delta.fromArray(point.world).sub(other.fromArray(previous.world));
      normal.fromArray(previous.normalWorld);
      connected=normal.dot(other.fromArray(point.normalWorld))>.90 && delta.length()<point.radiusMeters*5 &&
        Math.abs(delta.dot(normal))<Math.max(.002,point.radiusMeters*.12);
    }
    if(!connected){segment={meshKey,object,instanceId,points:[]};segments.push(segment);}
    segment.points.push(point);count++;
    if(point.roomId)rooms.add(point.roomId);
    anchor??=hit;
  }
  return {
    get count(){return count;},
    get region(){return {kind:'surface-stroke',anchor,segments,roomIds:[...rooms]};},
    matches(current){
      const cam=current.modes.camera;cam.updateMatrixWorld(true);
      return root===current.modes.activeRoot && cam===camera && matrix.equals(cam.matrixWorld) &&
        projection.equals(cam.projectionMatrix) && width===current.canvas.clientWidth && height===current.canvas.clientHeight;
    },
    add(uv,finish=false){
      if(!lastUV){sample(uv);lastUV=uv;return;}
      const dx=uv[0]-lastUV[0],dy=uv[1]-lastUV[1],pixels=Math.hypot(dx*width,dy*height);
      if(pixels<(finish ? 0.5 : 3))return;
      const steps=Math.ceil(pixels/3);
      for(let i=1;i<=steps;i++)sample([lastUV[0]+dx*i/steps,lastUV[1]+dy*i/steps]);
      lastUV=uv;
    }
  };
}

function strokePatch(segment){
  const points=segment.points,vertices=[],indices=[];
  const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),axis=new THREE.Vector3(),side=new THREE.Vector3(),center=new THREE.Vector3();
  for(let i=0;i<points.length;i++){
    const point=points[i];
    center.fromArray(point.world);normal.fromArray(point.normalWorld);
    tangent.fromArray(points[Math.min(i+1,points.length-1)].world).sub(axis.fromArray(points[Math.max(0,i-1)].world));
    side.crossVectors(normal,tangent);
    if(side.lengthSq()<1e-12){
      if(Math.abs(normal.x)<.8)axis.set(1,0,0);else axis.set(0,1,0);
      side.crossVectors(normal,axis);
    }
    side.normalize().multiplyScalar(point.radiusMeters);
    vertices.push(...axis.copy(center).add(side).toArray(),...axis.copy(center).sub(side).toArray());
    const j=i*2;
    if(i)indices.push(j-2,j-1,j,j,j-1,j+1);
    if(points.length===1){
      tangent.crossVectors(normal,side);
      vertices.push(...axis.copy(center).add(tangent).toArray(),...axis.copy(center).sub(tangent).toArray());
      indices.push(0,2,1,0,1,3);
    }
  }
  return {path:segment.object.path,vertices,indices,stroke:true};
}

export function captureStroke(ctx,stroke,number){
  if(!stroke.matches(ctx)||stroke.count<2)return null;
  const region=stroke.region;
  return {...region,view:captureView(ctx),markedView:markedView(ctx,region.anchor.uv,number)};
}

export function sampleArea(ctx,rect){
  const [l,t,r,b]=rect;
  if(!(r>l && b>t))return null;
  const reader=surfaceReader(ctx,rect), steps=13, objects=new Map(), samples=[],roomIds=new Set();
  let anchor,best=Infinity;
  for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){
    const hit=reader.read([l+(r-l)*x/(steps-1),t+(b-t)*y/(steps-1)]);
    if(!hit)continue;
    const {object,...surface}=hit;
    const meshKey=object.path.map(part=>part.childIndex).join('/')+'@'+(surface.instanceId??'');
    objects.set(meshKey,{...object,meshKey});
    if(hit.roomId)roomIds.add(hit.roomId);
    const sample={...surface,meshKey,objectKey:object.key,cell:[x,y]};
    samples.push(sample);
    const distance=(x-6)**2+(y-6)**2;
    if(distance<best){best=distance;anchor=sample;}
  }
  if(!anchor)return null;
  return {kind:'surface-area',rectUV:rect,grid:[steps,steps],samples,anchor,objects:[...objects.values()],roomIds:[...roomIds]};
}
export function captureArea(ctx,rect,number){
  const area=sampleArea(ctx,rect);
  if(!area)return null;
  return {...area,view:captureView(ctx),markedView:markedView(ctx,area.anchor.uv,number,rect)};
}

// Build the highlight from adjacent visible hits on the same surface.
// A window opening or a jump from a cabinet to a wall must leave a gap.
// A suggestion may mark several places; its markers combine every place's shape.
export function displayRegions(regions){
  const shapes=regions.filter(Boolean).map(displayRegion);
  return {pins:shapes.flatMap(s=>s.pins),patches:shapes.flatMap(s=>s.patches),members:shapes.flatMap(s=>s.members||[])};
}
export function noteRegions(note){return [note.region,...(note.extraRegions||[])];}
export function displayRegion(region){
  if(region.kind==='view')return {pins:[],patches:[]};
  if(region.kind==='placement')return {pins:[{world:region.anchor.world,path:region.anchor.object?.path}],patches:[{path:region.anchor.object?.path,...boxPatch(region.boundsWorld)}]};
  if(region.kind==='room-surface'){
    const pins=[{world:region.anchor.world,path:region.anchor.object?.path}];
    if(region.surface==='wall')return {pins,patches:[],members:region.members||[]};
    const lift=region.surface==='floor'?.006:-.006;
    return {pins,patches:region.polygon?.length>2?[{path:region.anchor.object?.path,...polygonPatch(region.polygon,region.anchor.world[1]+lift)}]:[]};
  }
  if(region.kind==='surface-stroke')return {pins:[{world:region.anchor.world,path:region.anchor.object.path}],patches:region.segments.map(strokePatch)};
  if(region.kind==='model-object')return {pins:[{world:region.anchor.world,path:region.anchor.object.path}],patches:[],members:region.members};
  if(region.points)return {pins:region.points.map(p=>({world:p.world,path:p.object?.path})),patches:[]};
  const objects=new Map((region.objects||[]).map(o=>[o.meshKey||o.key,o]));
  const key=s=>s.meshKey||s.objectKey;
  const patches=new Map(), cells=new Map(), [cols,rows]=region.grid||[1,1],rect=region.rectUV;
  for(const s of region.samples||[]){
    let patch=patches.get(key(s));
    if(!patch){patch={path:objects.get(key(s))?.path,vertices:[],indices:[]};patches.set(key(s),patch);}
    const cell=s.cell || [Math.round((s.uv[0]-rect[0])/(rect[2]-rect[0])*(cols-1)),Math.round((s.uv[1]-rect[1])/(rect[3]-rect[1])*(rows-1))];
    cells.set(cell[1]*cols+cell[0],{s,patch,index:patch.vertices.length/3});
    patch.vertices.push(...s.world);
  }
  function triangle(a,b,c){
    if(!a||!b||!c||a.patch!==b.patch||a.patch!==c.patch)return;
    const n=a.s.normalWorld;
    if(!n)return;
    for(const other of [b.s,c.s]){
      const cos=other.normalWorld?.reduce((sum,v,i)=>sum+v*n[i],0)??0;
      const offset=other.world.reduce((sum,v,i)=>sum+(v-a.s.world[i])*n[i],0);
      if(cos<.94||Math.abs(offset)>.035)return;
    }
    a.patch.indices.push(a.index,b.index,c.index);
  }
  for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){
    const k=y*cols+x,a=cells.get(k),b=cells.get(k+1),c=cells.get(k+cols),d=cells.get(k+cols+1);
    triangle(a,b,c);triangle(b,d,c);
  }
  return {pins:[{world:region.anchor.world,path:objects.get(key(region.anchor))?.path}],patches:[...patches.values()]};
}
export function pinMarkers(scene,name='Suggestion annotations') {
  const group=new THREE.Group(),towardCamera=new THREE.Vector3();
  group.name=name;group.renderOrder=100000;scene.add(group);
  let lastRoot,previous=[];
  function clear(){
    for(const item of group.children){
      if(!item.isSprite && !item.userData.sharedGeometry)item.geometry.dispose();
      item.material.map?.dispose();item.material.dispose();
    }
    group.clear();lastRoot=null;
  }
  function add(item,entry,path){
    item.userData={noteId:entry.id,path};
    item.renderOrder=(item.isSprite?100020:100010)+(entry.active?1:0);group.add(item);
  }
  return {
    set(entries){
      if(entries.length===previous.length && entries.every((e,i)=>e.id===previous[i].id && e.number===previous[i].number &&
        e.active===previous[i].active && e.shape===previous[i].shape))return;
      previous=entries;clear();
      for(const entry of entries){
        const color=entry.active?'#a34b19':'#115c4e';
        for(const member of entry.shape.members||[]){
          const mat=new THREE.MeshBasicMaterial({color:entry.active?0xff973f:0x32c7a3,transparent:true,opacity:entry.active?.30:.17,
            depthTest:false,depthWrite:false,toneMapped:false,side:THREE.FrontSide});
          const overlay=new THREE.Mesh(undefined,mat);
          overlay.matrixAutoUpdate=false;
          add(overlay,entry,member.path);overlay.userData.member=member;
        }
        for(const pin of entry.shape.pins){
          const tile=document.createElement('canvas');tile.width=tile.height=96;
          drawPin(tile.getContext('2d'),48,89,entry.number,29,48,41,color);
          const map=new THREE.CanvasTexture(tile);map.colorSpace=THREE.SRGBColorSpace;
          const marker=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,sizeAttenuation:false}));
          marker.center.set(.5,7/96);marker.frustumCulled=false;
          add(marker,entry,pin.path);
          marker.userData.world=pin.world;marker.userData.pixels=entry.active?42:33;
        }
        for(const patch of entry.shape.patches){
          const geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(patch.vertices,3));
          const fill=entry.active?0xe58239:0x3bb99d;
          if(patch.indices.length){
            geometry.setIndex(patch.indices);
            const mat=new THREE.MeshBasicMaterial({color:fill,side:THREE.DoubleSide,transparent:true,opacity:patch.stroke?.95:entry.active?.52:.32,
              depthTest:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
            const mesh=new THREE.Mesh(geometry,mat);add(mesh,entry,patch.path);mesh.userData.passive=!!patch.passive;
          }else{
            add(new THREE.Points(geometry,new THREE.PointsMaterial({color:fill,size:4,sizeAttenuation:false,transparent:true,depthTest:false,depthWrite:false})),entry,patch.path);
          }
        }
      }
    },
    update({modes,canvas}){
      if(!group.children.length)return;
      const camera=modes.camera,root=modes.activeRoot;
      const base=2*Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()/2))/canvas.clientHeight;
      for(const item of group.children){
        if(lastRoot!==root && item.userData.member){
          const source=nodeAt(root,item.userData.path);
          item.visible=!!source?.isMesh;
          if(item.visible){
            if(!item.userData.sharedGeometry)item.geometry.dispose();
            item.geometry=source.geometry;item.userData.sharedGeometry=true;
            source.updateWorldMatrix(true,false);item.matrix.copy(source.matrixWorld);
            const instance=item.userData.member.instanceId;
            if(instance!=null){const local=new THREE.Matrix4();source.getMatrixAt(instance,local);item.matrix.multiply(local);}
            item.matrixWorldNeedsUpdate=true;
          }
        }
        if(item.isSprite && item.visible){
          item.position.fromArray(item.userData.world);
          towardCamera.copy(camera.position).sub(item.position).normalize();item.position.addScaledVector(towardCamera,.006);
          item.scale.setScalar(base*item.userData.pixels);
        }
      }
      lastRoot=root;
    },
    hit(ctx,uv){
      const targets=group.children.filter(item=>item.visible&&!item.userData.passive);
      if(!targets.length)return null;
      group.updateWorldMatrix(true,true);ctx.modes.camera.updateMatrixWorld(true);
      const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(uv[0]*2-1,1-uv[1]*2),ctx.modes.camera);
      ray.params.Points.threshold=.09;
      const hit=ray.intersectObjects(targets,false).sort((a,b)=>b.object.renderOrder-a.object.renderOrder || a.distance-b.distance).find(h=>{
        if(Math.abs(h.point.clone().project(ctx.modes.camera).z)>1)return false;
        if(!h.object.isPoints)return true;
        const p=new THREE.Vector3().fromBufferAttribute(h.object.geometry.attributes.position,h.index).project(ctx.modes.camera);
        return Math.hypot(((p.x+1)/2-uv[0])*ctx.canvas.clientWidth,((1-p.y)/2-uv[1])*ctx.canvas.clientHeight)<=4;
      });
      return hit?.object.userData.noteId ?? null;
    },
    dispose(){clear();scene.remove(group);},
    withoutMarkers(fn){group.visible=false;try{return fn();}finally{group.visible=true;}}
  };
}
