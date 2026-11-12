import * as THREE from 'three';

const vector = p => new THREE.Vector3(...p);
const point = (base, axis, distance) => base.clone().addScaledVector(axis, distance);

// Camera-independent drafting. The caller supplies the actual atlas aspect ratio.
export function buildWallDimensionSpecs(surfaces, aspectForText) {
  if (typeof aspectForText !== 'function') throw new Error('Measured text aspect ratios are required.');
  return [...surfaces].sort((a,b) => a.id.localeCompare(b.id,'en')).flatMap(face => {
    const right=vector(face.right).normalize(),up=new THREE.Vector3(0,1,0),normal=vector(face.normal).normalize();
    const origin=vector(face.origin).addScaledVector(normal,.012);
    const entries=['width','height'].map(axis => {
      const horizontal=axis==='width',length=face[axis],valueMm=Math.round(length*1000),text=String(valueMm),aspect=aspectForText(text);
      if (!Number.isFinite(aspect)||aspect<=0) throw new Error('Invalid text aspect for '+text);
      const textHeight=Math.min(.18,length/(aspect+1.4),(horizontal?face.height:face.width)*.45);
      return {axis,horizontal,length,valueMm,text,aspect,textHeight};
    });
    const widthY=face.height*.68;
    // Use fixed lanes and uniformly shrink text only if this face is too small.
    // This is a one-time layout in wall coordinates, never a screen-space rule.
    for(let attempt=0;attempt<20;attempt++) {
      const [w,h]=entries,x=Math.max(h.textHeight*.6,Math.min(.17,face.width*.18));
      const xOverlap=face.width/2-w.textHeight*w.aspect/2 < x+h.textHeight/2+.008;
      const yOverlap=widthY-w.textHeight/2 < face.height/2+h.textHeight*h.aspect/2+.008;
      if(!xOverlap||!yOverlap) break;
      for(const entry of entries) entry.textHeight*=.85;
    }
    const heightX=Math.max(entries[1].textHeight*.6,Math.min(.17,face.width*.18));
    return entries.map(({axis,horizontal,length,valueMm,text,aspect,textHeight}) => {
      const textWidth=textHeight*aspect,along=horizontal?right:up,across=horizontal?up:right.clone().negate();
      const a=horizontal?point(origin,up,widthY):point(origin,right,heightX),b=point(a,along,length),center=point(a,along,length/2);
      const gap=textWidth/2+Math.min(.025,length*.035),tick=Math.min(.028,length*.04,(horizontal?face.height:face.width)*.13);
      const lines=[[a,point(center,along,-gap)],[point(center,along,gap),b]];
      for(const [index,end] of [a,b].entries()) {
        const diagonal=along.clone().multiplyScalar(index===0?1:-1).add(across).multiplyScalar(tick*1.4);
        lines.push([end.clone(),end.clone().add(diagonal)],[point(end,across,-tick*1.6),point(end,across,tick*1.6)]);
      }
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>center.clone().addScaledVector(along,x*textWidth/2).addScaledVector(across,y*textHeight/2));
      return {id:face.id+':'+axis,faceId:face.id,axis,valueMm,text,length,textAspect:aspect,textWidth,textHeight,normal:normal.toArray(),
        a:a.toArray(),b:b.toArray(),center:center.toArray(),right:along.toArray(),up:across.toArray(),corners:corners.map(p=>p.toArray()),lines:lines.map(pair=>pair.map(p=>p.toArray()))};
    });
  });
}
