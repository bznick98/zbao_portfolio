import { clampZoom, zoomAfterWheel } from './measurements.js';
import { createWallAnnotations } from './wall-annotations.js';

export function installHouseControls({ camera, renderer, root, scene, modes }) {
  const $ = id => document.getElementById(id);
  const slider = $('view-zoom'), output = $('zoom-value'), toggle = $('dimensions-toggle');
  const note = $('dimensions-note');
  let annotations;
  function setZoom(value) {
    camera.zoom = clampZoom(value);
    camera.updateProjectionMatrix();
    slider.value = String(camera.zoom);
    output.value = `${camera.zoom.toFixed(2)}×`;
    slider.setAttribute('aria-valuetext', `${camera.zoom.toFixed(2)} times`);
  }
  slider.disabled = toggle.disabled = $('zoom-reset').disabled = false;
  slider.addEventListener('input', () => setZoom(Number(slider.value)));
  $('zoom-reset').addEventListener('click', () => setZoom(1));
  renderer.domElement.addEventListener('wheel', event => {
    if (modes.mode !== 'walk' || event.ctrlKey || !Number.isFinite(event.deltaY)) return;
    event.preventDefault();
    setZoom(zoomAfterWheel(camera.zoom, event.deltaY, event.deltaMode, innerHeight));
  }, { passive: false });
  toggle.addEventListener('change', () => {
    if (toggle.checked && !annotations) { annotations = createWallAnnotations(root); scene.add(annotations.group); }
    if (annotations) annotations.group.visible = toggle.checked && modes.mode === 'walk';
    note.hidden = !toggle.checked;
  });
  modes.subscribe(mode => { if (annotations) annotations.group.visible = toggle.checked && mode === 'walk'; });
  setZoom(1);
  return {
    getState: () => ({ zoom: camera.zoom, effectiveFov: camera.getEffectiveFOV(), dimensions: toggle.checked, dimensionsVisible: Boolean(annotations?.group.visible),
      annotationMeshes: annotations?.group.children.length || 0,
      measurements: annotations?.surfaces.map(face => ({ ...face })) || [] }),
  };
}
