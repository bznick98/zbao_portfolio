import * as THREE from 'three';

// One recognizer for mouse, pen and touch; a drag, hold or multi-touch gesture
// can never become the first half of a teleport. Distances are CSS pixels.
export function createDoubleTapGesture() {
  const active = new Map();
  let previous = null;
  function reset() { active.clear(); previous = null; }
  return {
    reset,
    down(event) {
      if (event.button !== 0) { previous = null; return; }
      const tap = { x:event.clientX, y:event.clientY, time:event.timeStamp, type:event.pointerType, moved:false };
      if (active.size) {
        previous = null; tap.moved = true;
        for (const other of active.values()) other.moved = true;
      }
      active.set(event.pointerId, tap);
    },
    move(event) {
      const tap = active.get(event.pointerId);
      if (tap && Math.hypot(event.clientX-tap.x,event.clientY-tap.y) > (tap.type==='touch'?10:5)) {
        tap.moved = true; previous = null;
      }
    },
    up(event) {
      const tap = active.get(event.pointerId); active.delete(event.pointerId);
      if (!tap || tap.moved || active.size || event.timeStamp-tap.time>280) { previous=null; return false; }
      const close = previous && previous.type===tap.type && event.timeStamp-previous.time<=400 &&
        Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<=(tap.type==='touch'?26:8);
      previous = close ? null : { x:event.clientX, y:event.clientY, time:event.timeStamp, type:tap.type };
      return Boolean(close);
    },
  };
}

function visibleMeshes(root, floorsOnly=false) {
  const meshes=[];
  root.traverseVisible(object => { if(object.isMesh && (!floorsOnly || object.userData.layer==='Floors')) meshes.push(object); });
  return meshes;
}

export function pickModelFloor(root, camera, ndc) {
  root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc,camera);
  // Intersect the whole visible shell first: clicking a wall must not pick the
  // floor hidden behind it. Annotation meshes and the pawn are outside root.
  const hit=ray.intersectObjects(visibleMeshes(root),false)[0];
  if (!hit || hit.object.userData.layer!=='Floors' || !hit.face) return null;
  const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
  return normal.y>.7 ? hit.point : null;
}

export function floorBelow(root, position) {
  root.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(...position),new THREE.Vector3(0,-1,0),0,4);
  return ray.intersectObjects(visibleMeshes(root,true),false)[0]?.point.y ?? position[1]-1.6;
}

export function createPositionPawn() {
  const pawn=new THREE.Group(); pawn.name='Current walkthrough position';
  const gold=new THREE.MeshStandardMaterial({color:'#cf933e',roughness:.32,metalness:.15});
  const dark=new THREE.MeshStandardMaterial({color:'#514234',roughness:.45});
  const ghost=new THREE.MeshBasicMaterial({color:'#d9a34e',transparent:true,opacity:.28,depthTest:false,depthWrite:false,toneMapped:false});
  function part(geometry,material,y) {
    const mesh=new THREE.Mesh(geometry,material); mesh.position.y=y;
    mesh.renderOrder=1001;mesh.castShadow=mesh.receiveShadow=true; pawn.add(mesh); return mesh;
  }
  part(new THREE.CylinderGeometry(.29,.32,.09,32),dark,.045);
  part(new THREE.LatheGeometry([[.0,.0],[.25,.0],[.26,.06],[.21,.12],[.14,.20],[.11,.39],[.14,.48],[.14,.52],[0,.52]].map(p=>new THREE.Vector2(...p)),32),gold,.09);
  part(new THREE.SphereGeometry(.20,24,16),gold,.78);
  const heading=part(new THREE.ConeGeometry(.14,.35,3),dark,.10);
  heading.rotation.x=-Math.PI/2; heading.position.z=-.45;
  // A faint underlay keeps the locator discoverable behind a wall. The shaded
  // volume still uses real depth, so visible parts retain their 3D shape.
  for(const mesh of [...pawn.children]) {
    const silhouette=mesh.clone();silhouette.material=ghost;silhouette.renderOrder=1000;
    silhouette.castShadow=silhouette.receiveShadow=false;pawn.add(silhouette);
  }
  pawn.userData.kind='pawn';
  pawn.userData.dispose=()=>{for(const geometry of new Set(pawn.children.map(o=>o.geometry)))geometry.dispose();gold.dispose();dark.dispose();ghost.dispose();};
  return pawn;
}
