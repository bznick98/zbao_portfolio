// Render the scene only when the picture can change.
//
// The walkthrough's post-processing (multisampled colour, GTAO, shadows) is heavy.
// Rendering it at the display refresh rate while nobody moves keeps a laptop's GPU
// and CPU busy for nothing. The gate renders when the camera, its projection or the
// canvas size changed, for a short while after any input or asset load (damping,
// hover markers, async textures), when someone calls wake(), and once every few
// seconds as a safety net.
const INPUT=['pointerdown','pointermove','pointerup','wheel','keydown','keyup','touchstart','touchmove','touchend','click','input','change','resize','focus'];

export function createFrameGate({canvas,settleMs=700,heartbeatMs=10000}={}){
  const last=new Float64Array(34);let awakeUntil=0,lastRender=-Infinity,count=0;
  const wake=(ms=settleMs)=>{awakeUntil=Math.max(awakeUntil,performance.now()+ms);};
  for(const type of INPUT)window.addEventListener(type,()=>wake(),{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>wake());
  function moved(camera){
    camera.updateMatrixWorld();
    const values=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements,canvas?.width??0,canvas?.height??0];
    let changed=false;
    for(let i=0;i<values.length;i++)if(last[i]!==values[i]){last[i]=values[i];changed=true;}
    return changed;
  }
  return {
    wake,
    // Call once per animation frame with the camera that will render.
    shouldRender(camera,now=performance.now()){
      const go=moved(camera)||now<awakeUntil||now-lastRender>=heartbeatMs;
      if(go){lastRender=now;count++;}
      return go;
    },
    get renders(){return count;}
  };
}
