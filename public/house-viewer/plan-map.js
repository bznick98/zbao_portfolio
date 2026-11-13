import {roomText} from './i18n.js';
export function planTransform(data,width,height,padding=38){
 const points=[...data.outline,...data.walls.flatMap(w=>[w.a,w.b]),...(data.facades||[]).flatMap(f=>[f.a,f.b]),...data.columns.flatMap(c=>c.polygon)];
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 const scale=Math.min((width-2*padding)/(maxX-minX),(height-2*padding)/(maxY-minY));
 const offsetX=(width-(maxX-minX)*scale)/2,offsetY=(height-(maxY-minY)*scale)/2;
 return {scale,point:p=>[offsetX+(p[0]-minX)*scale,offsetY+(maxY-p[1])*scale],bounds:{minX,maxX,minY,maxY}};
}
function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function labelPoint(poly){
 const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);let best=null,score=-1;
 for(let y=1;y<10;y++)for(let x=1;x<10;x++){const p=[x0+(x1-x0)*x/10,y0+(y1-y0)*y/10];if(!inside(...p,poly))continue;let nearest=Infinity;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));nearest=Math.min(nearest,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}
  if(nearest>score){best=p;score=nearest;}
 }return {point:best,clearance:score};
}
export function createPlanMap(canvas){
 const ctx=canvas.getContext('2d'),base=document.createElement('canvas');base.width=canvas.width;base.height=canvas.height;const b=base.getContext('2d');let cached,roomId,language,transform,displayWidth;
 function redraw(data,room){
  transform=planTransform(data,canvas.width,canvas.height);const xy=transform.point,s=transform.scale;b.clearRect(0,0,base.width,base.height);b.fillStyle='#fff';b.fillRect(0,0,base.width,base.height);
  function poly(points,fill,stroke){b.beginPath();points.forEach((p,i)=>i?b.lineTo(...xy(p)):b.moveTo(...xy(p)));b.closePath();if(fill){b.fillStyle=fill;b.fill();}if(stroke){b.strokeStyle=stroke;b.stroke();}}
  b.lineWidth=1.5;poly(data.outline,'#fcfcfb','#5c6266');if(room)poly(room.polygon,'#eaf1f4');
  function line(a,c,color,width=1.5){b.beginPath();b.moveTo(...xy(a));b.lineTo(...xy(c));b.strokeStyle=color;b.lineWidth=width;b.stroke();}
  const lerp=(a,c,t)=>a.map((v,i)=>v+(c[i]-v)*t);
  for(const wall of data.walls){const dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],len=Math.hypot(dx,dy),n=[-dy/len*wall.thickness/2,dx/len*wall.thickness/2];let cursor=0;
   for(const opening of [...wall.openings].sort((a,c)=>a.start-c.start).concat([{start:1,end:1}])){
    if(opening.start>cursor){const a=lerp(wall.a,wall.b,cursor),c=lerp(wall.a,wall.b,opening.start);b.lineWidth=1.8;poly([[a[0]+n[0],a[1]+n[1]],[c[0]+n[0],c[1]+n[1]],[c[0]-n[0],c[1]-n[1]],[a[0]-n[0],a[1]-n[1]]],wall.kind==='finish_lining'?'#e9e9e5':'#f6f6f3','#24292c');}
    if(wall.closedSolidDoor&&opening.end>opening.start)line(lerp(wall.a,wall.b,opening.start),lerp(wall.a,wall.b,opening.end),'#64696b',2);
    cursor=Math.max(cursor,opening.end);
   }
   for(const leaf of wall.parkedLeaves||[])line(...leaf,'#737a7e',1.5);
  }
  for(const f of data.facades||[]){const dx=f.b[0]-f.a[0],dy=f.b[1]-f.a[1],len=Math.hypot(dx,dy),n=[-dy/len*.05,dx/len*.05];
   for(const side of [-1,1])line([f.a[0]+n[0]*side,f.a[1]+n[1]*side],[f.b[0]+n[0]*side,f.b[1]+n[1]*side],'#616b72',1.3);
   for(const t of f.stations||[]){const p=lerp(f.a,f.b,t);line([p[0]-n[0]*2,p[1]-n[1]*2],[p[0]+n[0]*2,p[1]+n[1]*2],'#424a50',1.5);}
  }
  for(const column of data.columns){b.lineWidth=2;poly(column.polygon,'#727675','#252a2c');}
  const font=Math.max(30,8*canvas.width/displayWidth);
  b.font=`${font}px system-ui, "Microsoft YaHei", sans-serif`;b.textAlign='center';b.textBaseline='middle';b.fillStyle='#60686c';
  const boxes=[];
  for(const r of data.rooms){
   const p=labelPoint(r.polygon);if(!p.point||p.clearance<.65)continue;
   const [x,y]=xy(p.point),maxWidth=p.clearance*s*2,words=roomText(r.name).split(' '),lines=[''];
   for(const word of words){const next=[lines.at(-1),word].filter(Boolean).join(' ');if(lines.at(-1)&&b.measureText(next).width>maxWidth)lines.push(word);else lines[lines.length-1]=next;}
   const textWidth=Math.max(...lines.map(line=>b.measureText(line).width)),textHeight=lines.length*font*1.15;
   if(lines.length>2||textWidth>maxWidth||textHeight>maxWidth)continue;
   const box={x:x-textWidth/2,y:y-textHeight/2,w:textWidth,h:textHeight};
   if(boxes.some(a=>box.x<a.x+a.w&&box.x+box.w>a.x&&box.y<a.y+a.h&&box.y+box.h>a.y))continue;
   boxes.push(box);lines.forEach((line,i)=>b.fillText(line,x,y+(i-(lines.length-1)/2)*font*1.15));
  }
  const length=2*s,x=42,y=base.height-15;b.strokeStyle='#3f484d';b.lineWidth=2;b.beginPath();b.moveTo(x,y-8);b.lineTo(x,y);b.lineTo(x+length,y);b.lineTo(x+length,y-8);b.stroke();b.font='20px system-ui';b.textAlign='left';b.fillStyle='#667077';b.fillText('2 m',x+length+10,y-2);
 }
 return {draw(data,position,yaw,room){const lang=document.documentElement.lang,width=canvas.clientWidth||canvas.width;if(cached!==data||roomId!==room?.id||language!==lang||displayWidth!==width){cached=data;roomId=room?.id;language=lang;displayWidth=width;redraw(data,room);}
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(base,0,0);const p=transform.point([position[0],-position[2]]),angle=yaw+Math.PI/2;
  ctx.beginPath();ctx.moveTo(...p);for(let k=-.6;k<=.6;k+=.08)ctx.lineTo(p[0]+52*Math.cos(angle+k),p[1]-52*Math.sin(angle+k));ctx.closePath();ctx.fillStyle='#2784a635';ctx.fill();
  ctx.beginPath();ctx.arc(...p,11,0,Math.PI*2);ctx.fillStyle='#167a9d';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();
 },getState(){return {style:'plan',source:'revision layout metadata',scale:transform?.scale,pixelWidth:canvas.width,pixelHeight:canvas.height};}};
}
