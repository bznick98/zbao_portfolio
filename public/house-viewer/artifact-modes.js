import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDoubleTapGesture, createPositionPawn, floorBelow, pickModelFloor } from './model-teleport.js';
import { setText } from './i18n.js';

export const SHELL_LAYERS = new Set(['Walls', 'Structure', 'Floors', 'Doors', 'Windows']);

export function createShell(root) {
  const shell = root.clone(true), materials = new Map(), counts = {};
  shell.name = 'Architectural shell';
  const colors = { Walls: '#ece9df', Structure: '#c6c4ba', Floors: '#d7c7a9', Doors: '#a39b88', Windows: '#656e6c' };
  shell.traverse(object => {
    if (!object.isMesh) return;
    const layer = object.userData.layer;
    object.visible = object.visible && (SHELL_LAYERS.has(layer) || object.userData.fixedFitout);
    if (!object.visible) return;
    counts[layer] = (counts[layer] || 0) + 1;
    if (object.userData.fixedFitout) return;
    const source = Array.isArray(object.material) ? object.material : [object.material];
    const replaced = source.map(material => {
      const key = `${layer}:${material.transparent ? 'glass' : 'solid'}`;
      if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
        color: material.transparent ? '#bbd4d5' : colors[layer], roughness: .8,
        metalness: 0, transparent: material.transparent, opacity: material.transparent ? .2 : 1,
        depthWrite: !material.transparent, side: material.side,
      }));
      return materials.get(key);
    });
    object.material = Array.isArray(object.material) ? replaced : replaced[0];
  });
  shell.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  shell.traverseVisible(object => { if (object.isMesh) bounds.union(new THREE.Box3().setFromObject(object)); });
  return { shell, bounds, counts, dispose() { for (const material of materials.values()) material.dispose(); } };
}

export function fitOverview(camera, bounds, aspect) {
  const center = bounds.getCenter(new THREE.Vector3()), radius = bounds.getSize(new THREE.Vector3()).length() / 2;
  camera.aspect = aspect;
  const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect));
  const distance = radius / Math.sin(halfFov) * 1.12;
  camera.zoom = 1; camera.near = .1; camera.far = distance * 5 + radius;
  // Blender +Y maps to Three -Z: plan-up is at the top, never a claim of north.
  camera.position.copy(center).addScaledVector(new THREE.Vector3(0, .82, .57).normalize(), distance);
  camera.lookAt(center); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  return { center, radius, distance };
}

function appearanceSignature(root) {
  let hash = 2166136261;
  root.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const value = `${object.uuid}:${object.visible}:` + materials.map(material => `${material.uuid}:${material.color?.getHexString()}:${material.roughness}:${material.opacity}`).join('|');
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  });
  return hash >>> 0;
}

export function createArtifactModes({ root, scene, walkCamera, renderer, getWalkPose, restoreWalkPose, clearWalkInput, resolveTeleport = () => null, canTeleport = () => true, onTeleportRejected = () => {}, bindUI = true, walkAvailable = true }) {
  const { shell, bounds, counts, dispose: disposeShell } = createShell(root);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
  const originalBackground = new THREE.Color('#d5dfe2');
  const modelBackground = new THREE.Color('#e7e8e2');
  const subscribers = new Set(), pointers = new Set();
  const canvas = renderer.domElement;
  let bound = false;
  const inputEvents = new AbortController();
  let mode = 'walk', savedPose, originalVisibility = root.visible, controls;
  let viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
  const marker = createPositionPawn(), taps = createDoubleTapGesture();
  shell.visible = marker.visible = false; scene.add(shell, marker);

  function poseCopy(value) { return JSON.parse(JSON.stringify(value)); }
  function resetOverview() {
    taps.reset();
    const fit = fitOverview(camera, bounds, canvas.clientWidth / canvas.clientHeight);
    if (controls) {
      controls.target.copy(fit.center); controls.cursor.copy(fit.center);
      controls.minDistance = fit.radius * .45; controls.maxDistance = fit.distance * 2.5;
      controls.maxTargetRadius = fit.radius * .45;
      controls.minPolarAngle = .08; controls.maxPolarAngle = Math.PI * .46;
      controls.update(); controls.saveState();
    }
  }
  function stopModelInput() {
    taps.reset();
    for (const pointerId of pointers) if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    pointers.clear();
    controls?.dispose(); controls = null;
    canvas.style.touchAction = 'none';
  }
  function teleportAt(clientX, clientY) {
    if(mode!=='model'||!walkAvailable||!canTeleport())return null;
    const box=canvas.getBoundingClientRect();
    if(clientX<box.left||clientX>box.right||clientY<box.top||clientY>box.bottom)return null;
    const point=pickModelFloor(shell,camera,new THREE.Vector2((clientX-box.left)/box.width*2-1,-(clientY-box.top)/box.height*2+1));
    return point ? resolveTeleport(point,poseCopy(savedPose)) : null;
  }
  canvas.addEventListener('pointerdown', event => {
    if(mode!=='model')return;
    pointers.add(event.pointerId);
    if(canTeleport())taps.down(event);else taps.reset();
  }, {capture:true,signal:inputEvents.signal});
  canvas.addEventListener('pointermove', event => taps.move(event), {capture:true,signal:inputEvents.signal});
  canvas.addEventListener('pointerup', event => {
    if(mode!=='model'||!walkAvailable||!canTeleport()){taps.reset();return;}
    if(!taps.up(event))return;
    const pose=teleportAt(event.clientX,event.clientY);
    // Let OrbitControls finish releasing its pointer before changing modes.
    queueMicrotask(()=>{
      if(inputEvents.signal.aborted||mode!=='model'||!canTeleport())return;
      if(!pose){onTeleportRejected();return;}
      savedPose=pose;setMode('walk');
    });
  }, {capture:true,signal:inputEvents.signal});
  canvas.addEventListener('pointercancel',()=>taps.reset(),{signal:inputEvents.signal});
  canvas.addEventListener('lostpointercapture',event=>{if(pointers.has(event.pointerId))taps.reset();},{signal:inputEvents.signal});
  window.addEventListener('blur',()=>taps.reset(),{signal:inputEvents.signal});
  canvas.addEventListener('wheel',()=>taps.reset(),{passive:true,signal:inputEvents.signal});
  for (const event of ['pointerup', 'pointercancel']) canvas.addEventListener(event, event => pointers.delete(event.pointerId), {capture:true,signal:inputEvents.signal});
  function syncUI() {
    if(!bound)return;
    document.documentElement.dataset.artifactMode = mode;
    for (const value of ['walk', 'model']) {
      const button = document.getElementById(`mode-${value}`);
      button.disabled = value==='walk'&&!walkAvailable; button.setAttribute('aria-pressed', String(mode === value));
    }
    document.getElementById('model-reset').disabled = false;
    for (const callback of subscribers) callback(mode);
  }
  function setMode(next) {
    if (!['walk', 'model'].includes(next) || next === mode || (next==='walk'&&!walkAvailable)) return;
    clearWalkInput();
    if (next === 'model') {
      savedPose = poseCopy(getWalkPose()); originalVisibility = root.visible; mode = 'model';
      if (document.pointerLockElement) document.exitPointerLock();
      root.visible = false; shell.visible = true; marker.visible = walkAvailable; scene.background = modelBackground;
      marker.position.fromArray(savedPose.position);
      marker.position.y=floorBelow(shell,savedPose.position)+.015;
      marker.rotation.y = savedPose.yaw;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = false; controls.screenSpacePanning = false;
      controls.rotateSpeed = .7; controls.panSpeed = .7; controls.zoomSpeed = .85;
      resetOverview();
    } else {
      stopModelInput(); mode = 'walk'; shell.visible = marker.visible = false;
      root.visible = originalVisibility; scene.background = originalBackground;
      restoreWalkPose(poseCopy(savedPose));
    }
    syncUI();
  }
  function activate() {
    bound=true;
    document.getElementById('mode-walk').onclick = () => setMode('walk');
    document.getElementById('mode-model').onclick = () => setMode('model');
    document.getElementById('model-reset').onclick = resetOverview;
    setText(document.getElementById('model-teleport-hint'),matchMedia('(pointer:coarse)').matches?'modelTeleportTouch':'modelTeleportDesktop');
    syncUI();
  }
  if(bindUI)activate();
  return {
    get mode() { return mode; },
    get activeRoot() { return mode === 'walk' ? root : shell; },
    get camera() { return mode === 'walk' ? walkCamera : camera; },
    setMode, resetOverview, activate, teleportAt,
    update() {
      if(mode!=='model')return;
      camera.updateMatrixWorld(true);
      const base=marker.position.clone().project(camera),top=marker.position.clone().add(new THREE.Vector3(0,.98,0)).project(camera);
      const pixels=Math.abs(top.y-base.y)*canvas.clientHeight/2;
      marker.scale.setScalar(THREE.MathUtils.clamp(16/Math.max(pixels,1),1,2.5));
    },
    restoreModelView(view) {
      if(!controls||!view?.target)return;
      camera.position.fromArray(view.position);camera.quaternion.fromArray(view.quaternion);camera.zoom=view.zoom;
      controls.target.fromArray(view.target);camera.updateProjectionMatrix();controls.update();
    },
    subscribe(callback) { subscribers.add(callback); callback(mode); return () => subscribers.delete(callback); },
    resize(width, height) {
      if (width === viewport.width && height === viewport.height) return;
      viewport = { width, height };
      if (mode === 'model') resetOverview();
    },
    getState() {
      camera.updateMatrixWorld(true);
      const corners = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x,y,z).project(camera).toArray());
      return { mode, walkPose: poseCopy(mode === 'walk' ? getWalkPose() : savedPose),
        marker: { kind:'pawn', position: marker.position.toArray(), yaw: marker.rotation.y, visible: marker.visible, projected: marker.position.clone().project(camera).toArray() },
        modelView: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), target: controls?.target.toArray(), zoom: camera.zoom, boundsInView: corners.every(point => point.every(Number.isFinite) && Math.abs(point[0]) <= 1 && Math.abs(point[1]) <= 1 && point[2] >= -1 && point[2] <= 1) },
        shell: { visible: shell.visible, layers: { ...counts }, sharesGeometry: true },
        walkRootVisible: root.visible, walkAppearance: appearanceSignature(root), resources: { ...renderer.info.memory },
      };
    },
    dispose() { inputEvents.abort(); subscribers.clear(); stopModelInput(); disposeShell(); marker.userData.dispose(); scene.remove(shell, marker); },
  };
}
