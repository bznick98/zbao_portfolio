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
  const input=()=>setZoom(Number(slider.value)),reset=()=>setZoom(1);
  slider.addEventListener('input', input);
  $('zoom-reset').addEventListener('click', reset);
  const wheel=event => {
    if (modes.mode !== 'walk' || event.ctrlKey || !Number.isFinite(event.deltaY)) return;
    event.preventDefault();
    setZoom(zoomAfterWheel(camera.zoom, event.deltaY, event.deltaMode, innerHeight));
  };
  renderer.domElement.addEventListener('wheel',wheel,{passive:false});
  setZoom(camera.zoom);
  return {
    dispose(){slider.removeEventListener('input',input);$('zoom-reset').removeEventListener('click',reset);renderer.domElement.removeEventListener('wheel',wheel);},
    getState: () => ({ zoom: camera.zoom, effectiveFov: camera.getEffectiveFOV(), ...tools.getState() }),
  };
}
