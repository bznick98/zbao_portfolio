import * as THREE from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';

// Static architectural meshes: build once per loaded revision. Broad-phase boxes
// only reject impossible hits; the leaf test remains Three.js's exact mesh raycast.
// Rebuild after geometry/transforms change (revision replacement does this).
export function createDimensionOcclusion(root) {
  root.updateMatrixWorld(true);
  const entries = [],accelerated=new Set();
  root.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh.userData.dimension_occluder === false) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.every(m => m.transparent && m.opacity < .75)) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = mesh.isInstancedMesh || mesh.isSkinnedMesh
      ? new THREE.Box3().setFromObject(mesh)
      : mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    if (!box.isEmpty()) entries.push({mesh, box});
    const triangles=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;
    if(triangles>=48&&!mesh.isSkinnedMesh&&!mesh.isInstancedMesh&&!mesh.geometry.morphAttributes.position?.length){
      // Indirect mode preserves the exported index order and deterministic face IDs.
      mesh.geometry.boundsTree ||= new MeshBVH(mesh.geometry,{indirect:true,verbose:false});accelerated.add(mesh);
    }
  });
  function build(items) {
    const box = new THREE.Box3();
    for (const item of items) box.union(item.box);
    if (items.length <= 4) return {box, items};
    const size = box.getSize(new THREE.Vector3());
    const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
    items.sort((a,b) => (a.box.min[axis]+a.box.max[axis])-(b.box.min[axis]+b.box.max[axis]));
    const middle = items.length >> 1;
    return {box, left:build(items.slice(0,middle)), right:build(items.slice(middle))};
  }
  const tree = build(entries), hits = [], bounds = new Map(entries.map(e=>[e.mesh,e.box]));
  let ox,oy,oz,ix,iy,iz;
  const stats = {meshes:entries.length,acceleratedMeshes:accelerated.size, queries:0, boxTests:0, meshTests:0};
  // Slab interval clipped to the ray segment, including origins inside a box.
  function entryDistance(box, raycaster) {
    stats.boxTests++;
    let near = raycaster.near, far = raycaster.far;
    let a=(box.min.x-ox)*ix,b=(box.max.x-ox)*ix;
    if(ix<0)[a,b]=[b,a];if(a>near)near=a;if(b<far)far=b;if(far<near)return Infinity;
    a=(box.min.y-oy)*iy;b=(box.max.y-oy)*iy;
    if(iy<0)[a,b]=[b,a];if(a>near)near=a;if(b<far)far=b;if(far<near)return Infinity;
    a=(box.min.z-oz)*iz;b=(box.max.z-oz)*iz;
    if(iz<0)[a,b]=[b,a];if(a>near)near=a;if(b<far)far=b;if(far<near)return Infinity;
    return near;
  }
  function visible(mesh) {
    for (let item=mesh; item; item=item.parent) if (!item.visible) return false;
    return true;
  }
  function hit(mesh,raycaster){
    stats.meshTests++;hits.length=0;
    if(accelerated.has(mesh)){
      const firstHitOnly=raycaster.firstHitOnly;raycaster.firstHitOnly=true;
      acceleratedRaycast.call(mesh,raycaster,hits);raycaster.firstHitOnly=firstHitOnly;
    }else mesh.raycast(raycaster,hits);
    return hits.length>0;
  }
  function visit(node, raycaster) {
    if (node.items) {
      for (const {mesh,box} of node.items) {
        if (!mesh.layers.test(raycaster.layers) || !visible(mesh) || entryDistance(box,raycaster) === Infinity) continue;
        if(hit(mesh,raycaster))return mesh;
      }
      return null;
    }
    const left = entryDistance(node.left.box,raycaster), right = entryDistance(node.right.box,raycaster);
    if (left <= right) return (left !== Infinity && visit(node.left,raycaster)) || (right !== Infinity && visit(node.right,raycaster));
    return (right !== Infinity && visit(node.right,raycaster)) || (left !== Infinity && visit(node.left,raycaster));
  }
  function blockingMesh(raycaster,previous=null) {
    stats.queries++;
    const ray=raycaster.ray;ox=ray.origin.x;oy=ray.origin.y;oz=ray.origin.z;
    ix=1/ray.direction.x;iy=1/ray.direction.y;iz=1/ray.direction.z;
    // Temporal coherence is an exact test, never cached visibility. During a
    // camera move most hidden anchors still hit the same intervening wall.
    const box=bounds.get(previous);
    if(box && previous.layers.test(raycaster.layers) && visible(previous) && entryDistance(box,raycaster)!==Infinity){
      if(hit(previous,raycaster))return previous;
    }
    return entryDistance(tree.box,raycaster)!==Infinity ? visit(tree,raycaster)||null : null;
  }
  return {blockingMesh,blocked:raycaster=>Boolean(blockingMesh(raycaster)),getStats:()=>({...stats})};
}
