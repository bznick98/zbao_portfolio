import * as THREE from 'three';
const v=p=>new THREE.Vector3(...p), point=(base,axis,d)=>base.clone().addScaledVector(axis,d);
// Authored once in world space. Camera motion can hide a dimension, never move it.
export function buildWallDimensionSpecs(surfaces) {
 return [...surfaces].sort((a,b)=>a.id.localeCompare(b.id,'en')).flatMap(face=>{
  const right=v(face.right),up=new THREE.Vector3(0,1,0),normal=v(face.normal).normalize(),origin=v(face.origin).addScaledVector(normal,.012);
  return ['width','height'].map(axis=>{
   const horizontal=axis==='width',length=face[axis],valueMm=Math.round(length*1000),text=String(valueMm),aspect=text.length*.58+.45;
   const textHeight=Math.min(.20,length/(aspect+1.4),(horizontal?face.height:face.width)*.55),textWidth=textHeight*aspect;
   const along=horizontal?right:up,across=horizontal?up:right.clone().negate();
   const a=horizontal?point(origin,up,face.height*.58):point(origin,right,Math.min(.17,face.width*.2)),b=point(a,along,length),center=point(a,along,length/2);
   const gap=textWidth/2+Math.min(.035,length*.035),tick=Math.min(.035,length*.04,(horizontal?face.height:face.width)*.13);
   const lines=[[a,point(center,along,-gap)],[point(center,along,gap),b]];
   for(const [index,end] of [a,b].entries()){const diagonal=along.clone().multiplyScalar(index===0?1:-1).add(across).multiplyScalar(tick*1.4);lines.push([end.clone(),end.clone().add(diagonal)],[point(end,across,-tick*1.6),point(end,across,tick*1.6)]);}
   const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>center.clone().addScaledVector(along,x*textWidth/2).addScaledVector(across,y*textHeight/2));
   return {id:face.id+':'+axis,faceId:face.id,axis,valueMm,text,length,textWidth,textHeight,priority:face.area,normal:normal.toArray(),a:a.toArray(),b:b.toArray(),center:center.toArray(),right:along.toArray(),up:across.toArray(),corners:corners.map(p=>p.toArray()),lines:lines.map(pair=>pair.map(p=>p.toArray()))};
  });
 });
}
export function intersects(a,b,gap=4){return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;}
export function segmentsCross(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return cross(a,b,c)*cross(a,b,d)<-1e-5&&cross(c,d,a)*cross(c,d,b)<-1e-5;}
export function segmentHitsBox(a,b,box,gap=4){
 const minX=box.x-gap,maxX=box.x+box.width+gap,minY=box.y-gap,maxY=box.y+box.height+gap,dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
 for(const [p,q] of [[-dx,a.x-minX],[dx,maxX-a.x],[-dy,a.y-minY],[dy,maxY-a.y]]){if(Math.abs(p)<1e-9){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}
 return true;
}
export function dimensionConflict(a,b){return intersects(a.box,b.box)||a.segments.some(([p,q])=>segmentHitsBox(p,q,b.box))||b.segments.some(([p,q])=>segmentHitsBox(p,q,a.box))||(a.faceId!==b.faceId&&a.segments.some(([p,q])=>b.segments.some(([r,s])=>segmentsCross(p,q,r,s))));}
// Select whole fixed dimensions. No packing, shifts, leaders or billboards.
export function selectWallDimensions(candidates,width,height,blocked=[],previous=new Set()){
 const placed=[],hidden=[],ordered=[...candidates].sort((a,b)=>Number(previous.has(b.id))-Number(previous.has(a.id))||b.priority-a.priority||a.id.localeCompare(b.id,'en'));
 for(const item of ordered){const points=[...item.corners,...item.segments.flat()];let reason;
  if(points.some(p=>p.x<8||p.y<8||p.x>width-8||p.y>height-8))reason='outside view';
  else if(blocked.some(box=>intersects(item.box,box)||item.segments.some(([a,b])=>segmentHitsBox(a,b,box))))reason='behind UI';
  else if(placed.some(other=>dimensionConflict(item,other)))reason='screen crowding';
  if(reason)hidden.push({id:item.id,reason});else placed.push(item);
 }
 return {placed,hidden};
}
