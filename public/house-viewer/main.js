import {installHouseControls} from './controls.js';
let houseControls;
import {initLanguage,t,setText,setRoomText} from './i18n.js';
initLanguage();
import * as THREE from 'three';
import {createArtifactModes} from './artifact-modes.js';
import {chooseRevisionPose,disposeModel} from './revision-state.js';
import {createPlanMap} from './plan-map.js';
import {createRevisionLoader} from './revision-loader.js';
import {installMeasurementTools} from './measurement-tools.js';
let artifactModes,measurementTools,revisionLoader,activeRoot,meshCount=0;
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id),stage=$('stage'),scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(65,1,.08,100);camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.appendChild(renderer.domElement);
scene.background=new THREE.Color('#d5dfe2');
const skyFill=new THREE.HemisphereLight(0xe9f1ff,0x8e9390,1.65);skyFill.position.set(15,13,4);scene.add(skyFill);scene.add(new THREE.AmbientLight(0xfff4e6,.08));
const sun=new THREE.DirectionalLight(0xfffaf0,3);sun.position.set(32,28,-2);sun.target.position.set(10,0,-7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:.5,far:90});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
const colorTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,colorTarget);const renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);const ao=new GTAOPass(scene,camera,innerWidth,innerHeight);ao.updateGtaoMaterial({radius:.5,scale:.65,thickness:.6,samples:16,distanceExponent:1,distanceFallOff:1});ao.blendIntensity=.65;ao.updatePdMaterial({radius:5,lumaPhi:10,depthPhi:2,normalPhi:3});composer.addPass(ao);composer.addPass(new OutputPass());
$('menu-toggle').onclick=()=>{const open=$('settings').hidden;$('settings').hidden=!open;$('menu-toggle').setAttribute('aria-expanded',String(open));};document.addEventListener('pointerdown',e=>{if(!e.target.closest('.nav')){$('settings').hidden=true;$('menu-toggle').setAttribute('aria-expanded','false');}});const mapStorageKey=`house-minimap:${location.pathname}`;
function setMapVisible(visible){$('map-toggle').checked=visible;$('map-panel').hidden=!visible;$('map-button').setAttribute('aria-pressed',String(visible));try{localStorage.setItem(mapStorageKey,String(visible));}catch{}if(visible)drawMap();}
$('map-toggle').onchange=e=>setMapVisible(e.target.checked);$('map-button').onclick=()=>setMapVisible(!$('map-toggle').checked);
try{const visible=localStorage.getItem(mapStorageKey)!=='false';$('map-toggle').checked=visible;$('map-panel').hidden=!visible;$('map-button').setAttribute('aria-pressed',String(visible));}catch{}
let data,ready=false,colliders=[],yaw=0,pitch=0,lastTime=performance.now(),lastMap=0,roomId='',lookPointer=null,joyPointer=null;const keys=new Set(),joy={x:0,y:0},velocity=new THREE.Vector2();let lastLook={x:0,y:0};
const pointIn=(x,y,p)=>{let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
function hull(points){const unique=[...new Map(points.map(p=>[p.map(v=>v.toFixed(4)).join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(unique.length<3)return [];const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const low=[],high=[];for(const p of unique){while(low.length>1&&cross(low.at(-2),low.at(-1),p)<=0)low.pop();low.push(p);}for(const p of unique.reverse()){while(high.length>1&&cross(high.at(-2),high.at(-1),p)<=0)high.pop();high.push(p);}return low.slice(0,-1).concat(high.slice(0,-1));}
function collisionAt(p,obstacles=colliders){let deepest=null;const r=.22;for(const c of obstacles){if(p.x<c.minX-r||p.x>c.maxX+r||p.z<c.minZ-r||p.z>c.maxZ+r)continue;const inside=pointIn(p.x,p.z,c.poly);let nearest=Infinity,bestX=0,bestZ=0,edgeX=0,edgeZ=0;for(let i=0;i<c.poly.length;i++){const a=c.poly[i],b=c.poly[(i+1)%c.poly.length],dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1),0,1),x=a[0]+t*dx,z=a[1]+t*dz,d=Math.hypot(p.x-x,p.z-z);if(d<nearest){nearest=d;bestX=x;bestZ=z;edgeX=dx;edgeZ=dz;}}if(!inside&&nearest>=r)continue;const depth=inside?r+nearest:r-nearest;let nx=inside?bestX-p.x:p.x-bestX,nz=inside?bestZ-p.z:p.z-bestZ;if(nearest<1e-8){nx=edgeZ;nz=-edgeX;}const normal=new THREE.Vector3(nx,0,nz).normalize();if(!deepest||depth>deepest.depth)deepest={normal,depth};}return deepest;}
function moveWorld(dx,dz){if(!ready||artifactModes?.mode==='model')return;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));for(let step=0;step<steps;step++){const candidate=camera.position.clone().add(new THREE.Vector3(dx/steps,0,dz/steps));if(!pointIn(candidate.x,-candidate.z,data.outline))continue;let blocked=false;for(let k=0;k<5;k++){const hit=collisionAt(candidate);if(!hit||hit.depth<.001)break;if(Math.abs(hit.normal.y)>.8){blocked=true;break;}candidate.add(new THREE.Vector3(hit.normal.x,0,hit.normal.z).multiplyScalar(hit.depth+.001));}const remaining=collisionAt(candidate);if(!blocked&&(!remaining||remaining.depth<.002)&&pointIn(candidate.x,-candidate.z,data.outline)){camera.position.x=candidate.x;camera.position.z=candidate.z;}}}
function look(){pitch=THREE.MathUtils.clamp(pitch,-Math.PI*.43,Math.PI*.43);camera.rotation.set(pitch,yaw,0,'YXZ');}
function clearInput(){if(lookPointer!==null&&renderer.domElement.hasPointerCapture(lookPointer))renderer.domElement.releasePointerCapture(lookPointer);if(joyPointer!==null&&pad.hasPointerCapture(joyPointer))pad.releasePointerCapture(joyPointer);keys.clear();joy.x=joy.y=0;velocity.set(0,0);$('stick').style.transform='';lookPointer=null;joyPointer=null;}
function go(id){if(artifactModes?.mode==='model')return;const s=data.stations.find(q=>q.station===id);if(!s)return;clearInput();camera.position.set(s.position[0],s.position[2]??1.6,-s.position[1]);yaw=s.yaw-Math.PI/2;pitch=s.pitch;look();$('rooms').value=id;roomId='';drawMap();}
function toast(key){setText($('toast'),key);$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function resize(){const w=innerWidth,h=innerHeight,aspect=w/h;camera.aspect=aspect;camera.fov=Math.min(85,THREE.MathUtils.radToDeg(2*Math.atan((data?.camera?.sensorWidthMm||36)/2/(data?.camera?.lensMm||16)/aspect)));camera.updateProjectionMatrix();const mode=$('quality').value;renderer.setPixelRatio(mode==='low'?1:Math.min(devicePixelRatio,mode==='high'?2:1.4));renderer.setSize(w,h);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);ao.enabled=mode!=='low';ao.setSize(Math.round(w*renderer.getPixelRatio()*.85),Math.round(h*renderer.getPixelRatio()*.85));renderer.shadowMap.enabled=mode!=='low';artifactModes?.resize(w,h);}
window.addEventListener('resize',resize);$('quality').onchange=resize;resize();
window.addEventListener('keydown',e=>{if(artifactModes?.mode==='model')return;if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
renderer.domElement.addEventListener('pointerdown',e=>{if(!ready||artifactModes?.mode==='model'||e.button!==0)return;lookPointer=e.pointerId;renderer.domElement.setPointerCapture(e.pointerId);lastLook={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointermove',e=>{if(!ready||artifactModes?.mode==='model')return;if(document.pointerLockElement===renderer.domElement||lookPointer===e.pointerId){const locked=document.pointerLockElement===renderer.domElement;const dx=locked?e.movementX:e.clientX-lastLook.x,dy=locked?e.movementY:e.clientY-lastLook.y;lastLook={x:e.clientX,y:e.clientY};yaw-=dx*.003;pitch-=dy*.003;look();}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,()=>lookPointer=null);
$('lock').onclick=async()=>{if(artifactModes?.mode==='model')return;try{await renderer.domElement.requestPointerLock();}catch{toast('dragHint');}};document.addEventListener('pointerlockchange',()=>{setText($('lock'),document.pointerLockElement?'unlock':'lock');clearInput();});
const pad=$('joystick');function joystick(e){const r=pad.getBoundingClientRect(),radius=r.width*.32;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const d=Math.hypot(x,y);if(d>radius){x*=radius/d;y*=radius/d;}joy.x=x/radius;joy.y=-y/radius;$('stick').style.transform=`translate(${x}px,${y}px)`;}
pad.addEventListener('pointerdown',e=>{e.preventDefault();if(!ready||artifactModes?.mode==='model')return;joyPointer=e.pointerId;pad.setPointerCapture(e.pointerId);joystick(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joystick(e);});for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,()=>{joyPointer=null;joy.x=joy.y=0;$('stick').style.transform='';});
$('rooms').onchange=e=>go(e.target.value);$('reset').onclick=()=>go(data.stations[0]?.station);$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('fullscreenError');}};
const planMap=createPlanMap($('minimap'));
function drawMap(){if(!data)return;const room=data.rooms.find(r=>pointIn(camera.position.x,-camera.position.z,r.polygon));if(room?.id!==roomId){roomId=room?.id||'';setRoomText($('room-name'),room?.name||'过道');}if(!$('map-panel').hidden&&artifactModes?.mode!=='model')planMap.draw(data,camera.position.toArray(),yaw,room);}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;if(document.hidden)return;if(ready&&artifactModes?.mode!=='model'){let side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joy.y;const len=Math.hypot(side,forward);if(len>1){side/=len;forward/=len;}const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?2.4:1.45;const target=new THREE.Vector2((Math.cos(yaw)*side-Math.sin(yaw)*forward)*speed,(-Math.sin(yaw)*side-Math.cos(yaw)*forward)*speed);velocity.lerp(target,1-Math.exp(-14*dt));if(velocity.lengthSq()>.00001)moveWorld(velocity.x*dt,velocity.y*dt);if(now-lastMap>80){drawMap();lastMap=now;}}renderPass.camera=artifactModes?.camera||camera;ao.camera=renderPass.camera;measurementTools?.update(now);composer.render();}

function capturePose(){return {position:camera.position.toArray(),yaw,pitch,room:roomId,station:$('rooms').value,zoom:camera.zoom};}
function restorePose(pose){camera.position.fromArray(pose.position);yaw=pose.yaw;pitch=pose.pitch;camera.zoom=pose.zoom;camera.updateProjectionMatrix();look();$('rooms').value=pose.station;roomId='';drawMap();}
function prepareRoot(root,info){
 const obstacles=[];let count=0;
 if(!info.outline?.length||!info.rooms?.length||!Array.isArray(info.stations)||!Array.isArray(info.walls)||!Array.isArray(info.columns))throw Error('Incomplete navigation data');
 root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.isMesh)return;count++;
  if(!info.web?.preserveSourceMaterials&&o.userData.layer==='Ceilings'&&o.material.name==='Finish_Plaster'){o.material=o.material.clone();o.material.name='Web_Ceiling_Matte';o.material.color.setRGB(.8,.8,.77);o.material.roughness=.95;}
  const mats=Array.isArray(o.material)?o.material:[o.material];o.castShadow=!mats.some(m=>m.transparent);o.receiveShadow=true;
  for(const m of mats){if(!info.web?.preserveSourceMaterials&&['Finish_Plaster','Structure_Unverified'].includes(m.name)){m.roughness=.92;m.metalness=0;}if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  if(o.userData.walkthrough_collision!==false&&['Walls','Windows','Doors','Structure','Joinery','Fixtures','Furniture'].includes(o.userData.layer)){
   const bounds=new THREE.Box3().setFromObject(o);
   if(bounds.min.y<1.6&&bounds.max.y>.22){const points=[],v=new THREE.Vector3(),position=o.geometry.attributes.position;for(let i=0;i<position.count;i++){v.fromBufferAttribute(position,i).applyMatrix4(o.matrixWorld);points.push([v.x,v.z]);}const poly=hull(points);if(poly.length>=3)obstacles.push({poly,minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z});}
  }
 });
 if(!count)throw Error('Empty model');return {obstacles,count};
}
function commitRevision(root,info){
 const {obstacles,count}=prepareRoot(root,info);
 const oldMode=artifactModes?.getState(),oldTools=measurementTools?.getState(),previous=ready?capturePose():null;
 const frame=data?.revision?.coordinateFrameId,newFrame=info.revision?.coordinateFrameId,sameGeometry=data?.revision?.geometrySha256===info.revision?.geometrySha256;
 const safe=position=>position.length===3&&position.every(Number.isFinite)&&pointIn(position[0],-position[2],info.outline)&&!collisionAt(new THREE.Vector3(...position),obstacles);
 const chosen=chooseRevisionPose({previous,previousFrame:frame,frame:newFrame,stations:info.stations,rooms:info.rooms,safe,contains:pointIn});
 const roomOptions=info.stations.map(s=>{const option=new Option('',s.station);setRoomText(option,s.name);return option;});
 // Prepare hidden groups without touching the current controls. Fetch, parsing and
 // navigation validation have all succeeded before this synchronous commit.
 let modes,tools;
 try{
  modes=createArtifactModes({root,scene,walkCamera:camera,renderer,clearWalkInput:clearInput,getWalkPose:capturePose,restoreWalkPose:restorePose,bindUI:false,walkAvailable:!!chosen.pose});
  tools=installMeasurementTools({root,scene,renderer,modes,plan:info.planDimensions,wallDimensions:info.wallDimensions,clearWalkInput:clearInput,bindUI:false});
 }catch(error){tools?.dispose();modes?.dispose();throw error;}
 clearInput();if(document.pointerLockElement)document.exitPointerLock();
 measurementTools?.dispose();artifactModes?.dispose();
 const previousRoot=activeRoot;if(previousRoot)scene.remove(previousRoot);
 data=info;activeRoot=root;colliders=obstacles;meshCount=count;artifactModes=modes;measurementTools=tools;
 scene.background=new THREE.Color('#d5dfe2');scene.add(root);$('rooms').replaceChildren(...roomOptions);
 if(chosen.pose)restorePose(chosen.pose);else{camera.position.set(0,1.6,0);yaw=pitch=0;roomId='';look();}
 if(data.web){const w=data.web;renderer.toneMappingExposure=w.exposureBase*2**(w.sourceExposure-w.sourceExposureBase);skyFill.intensity=w.skyIntensity;for(const light of scene.children)if(light.isAmbientLight)light.intensity=w.ambientIntensity;if(w.sun){sun.intensity=w.sun.energy*w.sunEnergyScale;sun.color.setRGB(...w.sun.color);sun.position.copy(sun.target.position).addScaledVector(new THREE.Vector3(...w.sun.direction),-40);}}
 ready=true;artifactModes.activate();measurementTools.activate();
 if(oldMode?.mode==='model'||!chosen.pose){artifactModes.setMode('model');if(frame&&frame===newFrame&&sameGeometry)artifactModes.restoreModelView(oldMode?.modelView);}
 if(oldTools){measurementTools.setDimensions(oldTools.dimensions);measurementTools.setMeasuring(oldTools.ruler.enabled);if(oldTools.ruler.points.length)setText($('measure-hint'),'revisionRulerCleared');}
 for(const id of ['rooms','reset','lock'])$(id).disabled=!chosen.pose;
 if(previousRoot)disposeModel(previousRoot);
 houseControls?.dispose();houseControls=installHouseControls({camera,renderer,root,scene,modes:artifactModes,tools:measurementTools});resize();drawMap();return chosen.reason;
}
async function init(){try{
 revisionLoader=await createRevisionLoader(commitRevision);
 if(!revisionLoader){const response=await fetch(window.__HOUSE_ASSETS.scene);if(!response.ok)throw Error(t('sceneError'));const info=await response.json();const gltf=await new GLTFLoader().loadAsync(window.__HOUSE_ASSETS.model,e=>{if(e.total){const p=Math.round(e.loaded/e.total*100);$('progress').value=p;setText($('load-text'),'loadingProgress',{percent:p});}});commitRevision(gltf.scene,info);go(data.stations[0]?.station);}
 $('loading').remove();parent.postMessage({type:'house:ready'},location.origin);setText($('help'),matchMedia('(pointer:coarse)').matches?'helpTouch':'helpDesktop');
 window.__walkthrough={get controls(){return houseControls;},get tools(){return measurementTools;},map:planMap,get modes(){return artifactModes;},get revisions(){return revisionLoader;},get ready(){return ready;},get meshCount(){return meshCount;},get colliderCount(){return colliders.length;},get stationCount(){return data.stations.length;},getState:()=>({position:camera.position.toArray(),yaw,pitch,room:roomId,speed:velocity.length(),fov:camera.fov,aspect:camera.aspect,drawCalls:renderer.info.render.calls,ambientOcclusion:ao.enabled,revisionId:data.revision?.revisionId,buildId:data.buildId}),go,moveWorld,collision:()=>{const h=collisionAt(camera.position);return h?{depth:h.depth,normal:h.normal.toArray()}:null;}};
 }catch(error){parent.postMessage({type:'house:error'},location.origin);console.error(error);setText($('load-text'),'loadError',{error:error.message});$('progress').removeAttribute('value');}}
requestAnimationFrame(animate);init();
