// All tolerances are model-space metres. No camera, viewport, time or mutable state.
export const DIMENSION_FILTER_POLICY=Object.freeze({nearLineDistance:.35,endpointAlignment:.012,directionCos:Math.cos(Math.PI/180),parallelFaceCos:Math.cos(Math.PI/180),planeDepth:.08,labelGap:.025});
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0),sub=(a,b)=>a.map((n,i)=>n-b[i]),add=(a,b,t=1)=>a.map((n,i)=>n+b[i]*t),length=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=length(a);return n?a.map(v=>v/n):a;};
const rank=(a,b)=>(b.face?.area||0)-(a.face?.area||0)||b.textHeight-a.textHeight||a.id.localeCompare(b.id,'en');

export function areNearbyDuplicates(a,b,policy=DIMENSION_FILTER_POLICY) {
  if(a.axis!==b.axis||a.valueMm!==b.valueMm||Math.abs(dot(a.right,b.right))<policy.directionCos)return false;
  const facing=dot(a.normal,b.normal);if(facing<-.0001)return false; // retain opposite room-facing sides
  const delta=sub(b.center,a.center);
  if(Math.max(Math.abs(dot(delta,a.right)),Math.abs(dot(delta,b.right)))>policy.endpointAlignment)return false;
  const distance=Math.min(Math.max(length(sub(a.a,b.a)),length(sub(a.b,b.b))),Math.max(length(sub(a.a,b.b)),length(sub(a.b,b.a))));
  if(distance>policy.nearLineDistance)return false;
  if(facing>=policy.parallelFaceCos)return Math.abs(dot(delta,a.normal))<=policy.planeDepth;
  // Neighbouring returns can share one height at a corner; opposite room sides
  // were rejected above, including when linked through a third perpendicular face.
  return true;
}

function coveredByParallelFace(item,other,policy) {
  if(dot(item.normal,other.normal)<policy.parallelFaceCos||other.face?.solidRatio<.98)return false;
  const depth=dot(sub(other.center,item.center),item.normal);if(depth<=.002||depth>policy.planeDepth)return false;
  const local=sub(item.center,other.face.origin),x=dot(local,other.face.right),y=local[1];
  return x>=0&&x<=other.face.width&&y>=0&&y<=other.face.height;
}
function representative(group,policy) {
  // Prefer the exposed finish over a dimension buried behind a parallel wall skin.
  const hiddenCount=item=>group.filter(other=>other!==item&&coveredByParallelFace(item,other,policy)).length;
  return [...group].sort((a,b)=>hiddenCount(a)-hiddenCount(b)||rank(a,b))[0];
}
export function dimensionLabelsOverlap(a,b,policy=DIMENSION_FILTER_POLICY) {
  if(dot(a.normal,b.normal)<-.0001)return false;
  // Cheap broad phase keeps initial drafting fast even with hundreds of faces.
  const reach=(Math.hypot(a.textWidth,a.textHeight)+Math.hypot(b.textWidth,b.textHeight))/2+policy.labelGap*2;
  if(length(sub(a.center,b.center))>reach)return false;
  const basisA=[a.right,a.up,a.normal],basisB=[b.right,b.up,b.normal];
  const axes=[...basisA,...basisB,...basisA.flatMap(x=>basisB.map(y=>cross(x,y)))].filter(axis=>length(axis)>1e-6).map(unit);
  return axes.every(axis=>{
    const x=a.corners.map(p=>dot(p,axis)),y=b.corners.map(p=>dot(p,axis));
    return Math.max(...x)+policy.labelGap>=Math.min(...y)&&Math.max(...y)+policy.labelGap>=Math.min(...x);
  });
}
function shift(spec,offset) {
  const move=p=>add(p,offset);
  return {...spec,a:move(spec.a),b:move(spec.b),center:move(spec.center),corners:spec.corners.map(move),lines:spec.lines.map(pair=>pair.map(move))};
}
function scaled(spec,factor) {
  const textWidth=spec.textWidth*factor,textHeight=spec.textHeight*factor,gap=textWidth/2+Math.min(.025,spec.length*.035);
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>add(add(spec.center,spec.right,x*textWidth/2),spec.up,y*textHeight/2));
  const lines=[[spec.a,add(spec.center,spec.right,-gap)],[add(spec.center,spec.right,gap),spec.b],...spec.lines.slice(2)];
  return {...spec,textWidth,textHeight,corners,lines};
}
function lanes(spec) {
  const face=spec.face;if(!face)return [spec];
  const horizontal=spec.axis==='width',axis=horizontal?[0,1,0]:face.right,extent=horizontal?face.height:face.width;
  const current=dot(sub(spec.center,face.origin),axis),margin=spec.textHeight/2+.01;
  return [current,...(horizontal?[.84,.5,.32,.16]:[.32,.5,.68,.84]).map(f=>extent*f)]
    .filter((value,index,all)=>index===0||(value>=margin&&value<=extent-margin&&all.findIndex(n=>Math.abs(n-value)<.001)===index))
    .map(value=>shift(spec,axis.map(n=>n*(value-current))));
}

export function filterDimensionSpecs(input,policy=DIMENSION_FILTER_POLICY) {
  const groups=[];
  for(const spec of [...input].sort(rank)) {
    // Complete-link grouping prevents a chain of neighbours consuming a long wall,
    // and prevents a perpendicular return joining opposite-facing room dimensions.
    const group=groups.find(items=>items.every(other=>areNearbyDuplicates(spec,other,policy)));
    if(group)group.push(spec);else groups.push([spec]);
  }
  const representatives=groups.map(items=>({spec:representative(items,policy),items})).sort((a,b)=>rank(a.spec,b.spec));
  const specs=[],removed=[],adjusted=[],unresolved=[];
  for(const {spec,items} of representatives) {
    let selected;
    for(const scale of [1,.85,.7]) {
      for(const candidate of lanes(scaled(spec,scale))) {
        if(!specs.some(other=>dimensionLabelsOverlap(candidate,other,policy))){selected=candidate;break;}
      }
      if(selected)break;
    }
    if(!selected){selected=spec;unresolved.push({id:spec.id,reason:'unique measurement retained; no non-overlapping lane'});}
    if(length(sub(selected.center,spec.center))>.0001||Math.abs(selected.textHeight-spec.textHeight)>.0001)adjusted.push({id:spec.id,offset:sub(selected.center,spec.center),textScale:selected.textHeight/spec.textHeight});
    specs.push(selected);
    for(const other of items)if(other.id!==spec.id)removed.push({id:other.id,representativeId:spec.id,axis:other.axis,valueMm:other.valueMm,reason:'nearby equal parallel dimension'});
  }
  specs.sort((a,b)=>a.id.localeCompare(b.id,'en'));removed.sort((a,b)=>a.id.localeCompare(b.id,'en'));adjusted.sort((a,b)=>a.id.localeCompare(b.id,'en'));unresolved.sort((a,b)=>a.id.localeCompare(b.id,'en'));
  return {specs,removed,adjusted,unresolved,policy:{...policy},generated:input.length,retained:specs.length};
}
