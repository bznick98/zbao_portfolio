// glTF can split one multi-material Blender object into primitive meshes.
// Preserve its layer on those children for both collision and the cutaway view.
export function prepareFixedLayout(root) {
  let fixedLayout = false;
  root.traverse(node => {
    if (node.userData.cad_entities && node.userData.height_status === 'assumed from function; plan-only') fixedLayout = true;
  });
  if (!fixedLayout) return;
  root.traverse(node => {
    if (!node.isMesh) return;
    let owner = node;
    while (owner.parent && !owner.userData.layer) owner = owner.parent;
    const {layer, walkthrough_collision} = owner.userData;
    if (!layer) return;
    node.userData.layer = layer;
    if (walkthrough_collision !== undefined) node.userData.walkthrough_collision = walkthrough_collision;
    node.userData.fixedFitout = layer === 'Joinery' || layer === 'Fixtures';
  });
}
