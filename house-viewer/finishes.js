import * as THREE from './vendor/three/three.module.js';

// A web presentation palette for the temporary V9 clay surfaces. Existing
// textured teak and transparent glass stay untouched. No source geometry edits.
export function finishFor(mesh, material) {
  if (material.name !== 'V9_White_Clay') return null;
  const name = mesh.name.toLowerCase(), layer = mesh.userData.layer;
  if (layer === 'Windows') return /coping|sill/.test(name) ? 'stone' : 'bronze';
  if (/handle|lever|tap|drain|pull|hinge|knob|riser|rain|mixer|hose|handset|flush|supply|sink/.test(name)) return 'chrome';
  if (/mirror/.test(name)) return 'mirror';
  if (/screen|hob|cooktop|grate|oven|appliance|hood|ac_recess|ac_slat/.test(name)) return 'charcoal';
  if (/coping|sill|_top$|counter/.test(name)) return 'stone';
  if (layer === 'Ceilings') return 'ceiling';
  if (layer === 'Floors') return name.startsWith('wet_') ? 'stone' : 'slab';
  if (layer === 'Walls') return name.includes('skirt') ? 'skirting' : 'plaster';
  if (layer === 'Structure') return 'plaster';
  if (layer === 'Doors') return name.includes('fire_exit') ? 'paint' : 'oak';
  if (layer === 'Fixtures') return 'ceramic';
  if (layer === 'Joinery') return /^(ref7_)?k_/.test(name) ? (name.includes('upper') ? 'sage' : 'paint') : 'oak';
  return 'plaster';
}

const palette = {
  plaster: { color: '#e9dfcc', roughness: .88, texture: 'plaster', bumpScale: .0012 },
  ceiling: { color: '#faf8f1', roughness: .94 },
  skirting: { color: '#aa9c88', roughness: .65 },
  oak: { color: '#997047', roughness: .54, texture: 'wood', bumpScale: .0008 },
  stone: { color: '#b9b7ad', roughness: .66, texture: 'stone', bumpScale: .0018 },
  bronze: { color: '#4c4941', roughness: .36, metalness: .65 },
  chrome: { color: '#b8c1c2', roughness: .24, metalness: .88 },
  ceramic: { color: '#f6f2e7', roughness: .22 },
  paint: { color: '#cfc7b5', roughness: .58 },
  sage: { color: '#9da594', roughness: .64 },
  charcoal: { color: '#323637', roughness: .32, metalness: .3 },
  mirror: { color: '#d2dce0', roughness: .12, metalness: .95 },
  slab: { color: '#aca99e', roughness: .95 },
};

function textures(kind) {
  const size = 256, color = new Uint8Array(size * size * 4), relief = new Uint8Array(size * size * 4);
  const noise = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7 + 19.3) * 43758.5453; return n - Math.floor(n); };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fine = noise(x, y), coarse = noise(Math.floor(x / 8), Math.floor(y / 8));
    const grain = noise(Math.floor(x + 1.5 * Math.sin(y * .025)), 17) * 2 - 1;
    const value = kind === 'wood' ? .91 + grain * .045 + fine * .025 : kind === 'stone' ? .89 + fine * .07 + coarse * .035 : .97 + fine * .025;
    const i = (y * size + x) * 4;
    color.set([value * 255, value * 255, value * 255, 255], i);
    const bump = kind === 'wood' ? 128 + grain * 24 + fine * 16 : 110 + fine * 35;
    relief.set([bump, bump, bump, 255], i);
  }
  function texture(bytes, srgb) {
    const result = new THREE.DataTexture(bytes, size, size); result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(kind === 'plaster' ? 6 : 2, kind === 'wood' ? 1 : 3);
    result.magFilter = THREE.LinearFilter; result.minFilter = THREE.LinearMipmapLinearFilter;
    result.generateMipmaps = true; result.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    result.needsUpdate = true; return result;
  }
  return { map: texture(color, true), bumpMap: texture(relief, false) };
}

export function applySurfaceMaterials(root) {
  const materials = new Map(), maps = new Map(), counts = {};
  root.traverse(object => {
    if (!object.isMesh) return;
    function replace(original) {
      const key = finishFor(object, original);
      if (!key) return original;
      if (!materials.has(key)) {
        const { texture, ...settings } = palette[key];
        if (texture && !maps.has(texture)) maps.set(texture, textures(texture));
        const material = original.clone();
        material.name = `House_${key}`; material.color.set(settings.color);
        material.roughness = settings.roughness; material.metalness = settings.metalness || 0;
        if (texture) { Object.assign(material, maps.get(texture)); material.bumpScale = settings.bumpScale; }
        material.envMapIntensity = key === 'mirror' ? .75 : .5;
        material.needsUpdate = true; materials.set(key, material);
      }
      counts[key] = (counts[key] || 0) + 1;
      return materials.get(key);
    }
    object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
  });
  return { counts, dispose() { for (const material of materials.values()) material.dispose(); for (const pair of maps.values()) { pair.map.dispose(); pair.bumpMap.dispose(); } } };
}

export function applyHouseFinishes({ root, scene, renderer }) {
  const result = applySurfaceMaterials(root);
  // A small neutral studio environment supplies soft specular reflections for
  // metal/ceramic. It is not a reflection of this apartment or an outdoor view.
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), new THREE.MeshBasicMaterial({ color: '#c4beb2', side: THREE.BackSide })));
  for (const [x, y, z, rotation] of [[-4.9, 1, 0, Math.PI / 2], [4.9, 1, 0, -Math.PI / 2], [0, 3.9, 0, 0]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(4), side: THREE.DoubleSide }));
    panel.position.set(x, y, z); if (y > 3) panel.rotation.x = Math.PI / 2; else panel.rotation.y = rotation; studio.add(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer), environment = generator.fromScene(studio, .12, .1, 30);
  scene.environment = environment.texture; scene.environmentIntensity = .25;
  generator.dispose(); studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
  for (const light of scene.children) {
    if (light.isHemisphereLight) light.groundColor.set('#c4bba7');
    if (light.isAmbientLight) light.intensity = Math.max(light.intensity, .22);
  }
  return { ...result, dispose() { result.dispose(); environment.dispose(); } };
}
