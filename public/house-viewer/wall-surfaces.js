import * as THREE from 'three';

export const DIMENSION_POLICY = Object.freeze({version:2,units:'m',minimumWidth:.02,minimumHeight:.05,minimumArea:.0008,verticalNormalTolerance:.002});
const rounded=n=>Math.round(n*10000)/10000||0;
const keyOf=p=>p.map(rounded).join(',');
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16).padStart(8,'0');};
const arr=v=>v.toArray().map(rounded);
function target(mesh){
 if(typeof mesh.userData.dimension_target==='boolean')return mesh.userData.dimension_target;
 return ['Walls','Structure'].includes(mesh.userData.layer)&&!/_skirt_/i.test(mesh.name);
}
function list(value){if(Array.isArray(value))return value;if(typeof value==='string')return JSON.parse(value);return [];}
function insideTriangle(x,y,t){
 let positive=false,negative=false;
 for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],c=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);positive ||= c>1e-5;negative ||= c< -1e-5;}
 return !(positive&&negative);
}

// Pure geometry/metadata input: no camera, UUID, random values or traversal-order IDs.
// Coplanar connected components are measured independently, including short walls,
// lintels and faces with openings. Width/height mean face extents, not room clearance.
export function buildWallSurfaceManifest(root){
 root.updateMatrixWorld(true);
 const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 meshes.sort((a,b)=>String(a.userData.id||a.name).localeCompare(String(b.userData.id||b.name),'en'));
 const surfaces=[],objects=[],skippedFaces=[],seen=new Set();
 for(const mesh of meshes){
  const objectId=String(mesh.userData.id||mesh.name);
  if(!target(mesh)){if(['Walls','Structure'].includes(mesh.userData.layer))objects.push({objectId,target:false,reason:mesh.userData.dimension_exclude_reason||'excluded decorative/explicit policy'});continue;}
  if(!objectId)throw Error('Dimension target needs a stable object ID/name');
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index,planes=new Map();
  if(!position)throw Error('Dimension target has no positions: '+objectId);
  const count=index?index.count:position.count;
  for(let i=0;i<count;i+=3){
   const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
   const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])),area=normal.length()/2;
   if(area<1e-9)continue;normal.normalize();
   if(Math.abs(normal.y)>DIMENSION_POLICY.verticalNormalTolerance)continue;
   normal.y=0;normal.normalize();const distance=normal.dot(points[0]),key=keyOf([...normal.toArray(),distance]);
   if(!planes.has(key)){const values=key.split(',').map(Number);planes.set(key,{normal:new THREE.Vector3(...values.slice(0,3)).normalize(),distance:values[3],triangles:[]});}
   planes.get(key).triangles.push({points,area});
  }
  let generated=0,eligible=0;
  for(const [planeKey,plane] of [...planes].sort(([a],[b])=>a.localeCompare(b,'en'))){
   const triangles=plane.triangles,parents=triangles.map((_,i)=>i),edges=new Map();
   const find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));
   const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[Math.max(a,b)]=Math.min(a,b);};
   for(let i=0;i<triangles.length;i++)for(let k=0;k<3;k++){
    const edge=[keyOf(triangles[i].points[k].toArray()),keyOf(triangles[i].points[(k+1)%3].toArray())].sort().join('|');
    if(edges.has(edge))join(i,edges.get(edge));else edges.set(edge,i);
   }
   const components=new Map();triangles.forEach((tri,i)=>{const id=find(i);if(!components.has(id))components.set(id,[]);components.get(id).push(tri);});
   for(const component of components.values()){
    const right=new THREE.Vector3(0,1,0).cross(plane.normal).normalize();
    const points=component.flatMap(t=>t.points),xs=points.map(p=>p.dot(right)),ys=points.map(p=>p.y);
    const left=Math.min(...xs),bottom=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-bottom,area=component.reduce((n,t)=>n+t.area,0);
    const faceKey=hash(planeKey+'|'+keyOf([left,bottom,width,height,area])),id=objectId+':'+faceKey;
    if(width<DIMENSION_POLICY.minimumWidth-1e-5||height<DIMENSION_POLICY.minimumHeight-1e-5||area<DIMENSION_POLICY.minimumArea){skippedFaces.push({id,objectId,reason:'below documented minimum',width:rounded(width),height:rounded(height)});continue;}
    eligible++;
    if(list(mesh.userData.dimension_skip_faces).includes(faceKey)){skippedFaces.push({id,objectId,reason:'explicit face exclusion'});continue;}
    if(seen.has(id))throw Error('Duplicate dimension face ID: '+id);seen.add(id);
    const origin=right.clone().multiplyScalar(left).addScaledVector(new THREE.Vector3(0,1,0),bottom).addScaledVector(plane.normal,plane.distance);
    const local=component.map(t=>t.points.map(p=>[p.dot(right)-left,p.y-bottom]));
    const anchors=[];
    // Preferred readable positions plus triangle centers: every anchor lies on the face,
    // so labels cannot attach to a doorway void or the gap between disconnected islands.
    for(const y of [.52,.72,.32,.88,.12])for(const x of [.5,.25,.75,.1,.9])if(local.some(t=>insideTriangle(x*width,y*height,t)))anchors.push([x*width,y*height]);
    const centers=local.map(tri=>[tri.reduce((n,p)=>n+p[0],0)/3,tri.reduce((n,p)=>n+p[1],0)/3]).sort((a,b)=>keyOf(a).localeCompare(keyOf(b),'en'));
    anchors.push(...centers);
    const unique=[...new Map(anchors.map(p=>[keyOf(p),p])).values()];
    const world=unique.map(([x,y])=>arr(origin.clone().addScaledVector(right,x).addScaledVector(new THREE.Vector3(0,1,0),y)));
    surfaces.push({id,faceKey,objectId,mesh:mesh.name,layer:mesh.userData.layer,width:rounded(width),height:rounded(height),area:rounded(area),solidRatio:rounded(area/(width*height)),origin:arr(origin),right:arr(right),normal:arr(plane.normal),anchors:world.slice(0,32),verticalEvidence:mesh.userData.vertical_dimensions||'model-derived'});generated++;
   }
  }
  objects.push({objectId,target:true,eligibleFaces:eligible,generatedFaces:generated});
 }
 surfaces.sort((a,b)=>a.id.localeCompare(b.id,'en'));objects.sort((a,b)=>a.objectId.localeCompare(b.objectId,'en'));skippedFaces.sort((a,b)=>a.id.localeCompare(b.id,'en'));
 return {schema:2,policy:DIMENSION_POLICY,surfaces,objects,skippedFaces,coverage:{targetObjects:objects.filter(o=>o.target).length,generatedFaces:surfaces.length,explicitlyExcludedFaces:skippedFaces.filter(f=>f.reason==='explicit face exclusion').length,belowMinimumFaces:skippedFaces.filter(f=>f.reason==='below documented minimum').length},note:'Dimensions are world-space model face extents. Heights may be assumed; not PDF/site validation.'};
}
