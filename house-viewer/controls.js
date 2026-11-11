import { clampZoom, zoomAfterWheel } from './measurements.js';

export function installHouseControls({ camera, renderer, root, scene, modes, tools }) {
  const $ = id => document.getElementById(id);
  const slider = $('view-zoom'), output = $('zoom-value');
  function setZoom(value) {
    camera.zoom = clampZoom(value);
    camera.updateProjectionMatrix();
    slider.value = String(camera.zoom);
    output.value = `${camera.zoom.toFixed(2)}×`;
    slider.setAttribute('aria-valuetext', `${camera.zoom.toFixed(2)} times`);
  }
  slider.disabled = $('zoom-reset').disabled = false;
  slider.addEventListener('input', () => setZoom(Number(slider.value)));
  $('zoom-reset').addEventListener('click', () => setZoom(1));
  renderer.domElement.addEventListener('wheel', event => {
    if (modes.mode !== 'walk' || event.ctrlKey || !Number.isFinite(event.deltaY)) return;
    event.preventDefault();
    setZoom(zoomAfterWheel(camera.zoom, event.deltaY, event.deltaMode, innerHeight));
  }, { passive: false });
  setZoom(1);
  return {
    getState: () => ({ zoom: camera.zoom, effectiveFov: camera.getEffectiveFOV(), ...tools.getState() }),
  };
}
