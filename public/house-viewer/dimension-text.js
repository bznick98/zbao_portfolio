import * as THREE from 'three';

// Use one measurement for the atlas UV rectangle, line gap and world-space quad.
// Never pass maxWidth to fillText/strokeText: it can horizontally squeeze glyphs.
export function createDimensionTextAtlas(values, background=false) {
  const texts=[...new Set(values)].sort(),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const font='600 64px Arial, sans-serif',cellHeight=96,padding=24,columns=8;
  ctx.font=font;
  const widths=new Map(texts.map(text=>[text,Math.ceil(ctx.measureText(text).width)+padding]));
  const cellWidth=Math.max(128,...widths.values())+8;
  canvas.width=cellWidth*columns;canvas.height=Math.max(1,Math.ceil(texts.length/columns))*cellHeight;
  ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
  const entries=new Map();
  for(const [i,text] of texts.entries()) {
    const x=(i%columns)*cellWidth,y=Math.floor(i/columns)*cellHeight,width=widths.get(text);
    if(background){ctx.fillStyle='rgba(250,250,246,.96)';ctx.fillRect(x+3,y+3,width-6,cellHeight-6);}
    else {ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.strokeText(text,x+width/2,y+cellHeight/2);}
    ctx.fillStyle='#17252e';ctx.fillText(text,x+width/2,y+cellHeight/2);
    entries.set(text,{aspect:width/cellHeight,width,height:cellHeight,uv:[x/canvas.width,1-(y+cellHeight)/canvas.height,(x+width)/canvas.width,1-y/canvas.height]});
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return {texture,entries,aspect:text=>{const entry=entries.get(text);if(!entry)throw new Error('Text missing from atlas: '+text);return entry.aspect;}};
}
