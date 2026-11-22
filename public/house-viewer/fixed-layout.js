// glTF can split one multi-material Blender object into primitive meshes.
// Preserve its layer on those children for both collision and the cutaway view.
export function prepareFixedLayout(root) {
  let fixedLayout = false;
  // The continuous valance belongs to the built-in coffee wall. Other assemblies
  // inherit fixed status when any tagged member is joinery or a fixture.
  const fixedAssemblies = new Set(['R16_coffee_wall']);
  root.traverse(node => {
    const {layer, assembly_id} = node.userData;
    if (assembly_id && (layer === 'Joinery' || layer === 'Fixtures')) fixedAssemblies.add(assembly_id);
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
    node.userData.fixedFitout = layer === 'Joinery' || layer === 'Fixtures' || fixedAssemblies.has(owner.userData.assembly_id);
  });
}
