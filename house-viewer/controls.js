import { clampZoom, zoomAfterWheel, createSectionMeasurer, projectDimension } from './measurements.js';

export function installHouseControls({ camera, renderer, root }) {
  const $ = id => document.getElementById(id);
  const slider = $('view-zoom'), output = $('zoom-value'), toggle = $('dimensions-toggle');
  const overlay = $('dimensions-overlay'), note = $('dimensions-note');
  const measure = createSectionMeasurer(root);
  let measurements = [], lastMeasure = -Infinity, lastDraw = -Infinity;
  const groups = new Map();
  const namespace = 'http://www.w3.org/2000/svg';
  function svg(name, attributes = {}) {
    const element = document.createElementNS(namespace, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  }
  function setZoom(value) {
    camera.zoom = clampZoom(value);
    camera.updateProjectionMatrix();
    slider.value = String(camera.zoom);
    output.value = `${camera.zoom.toFixed(2)}×`;
    slider.setAttribute('aria-valuetext', `${camera.zoom.toFixed(2)} times`);
    lastDraw = -Infinity;
  }
  slider.disabled = toggle.disabled = $('zoom-reset').disabled = false;
  slider.addEventListener('input', () => setZoom(Number(slider.value)));
  $('zoom-reset').addEventListener('click', () => setZoom(1));
  renderer.domElement.addEventListener('wheel', event => {
    if (event.ctrlKey || !Number.isFinite(event.deltaY)) return;
    event.preventDefault();
    setZoom(zoomAfterWheel(camera.zoom, event.deltaY, event.deltaMode, innerHeight));
  }, { passive: false });
  toggle.addEventListener('change', () => {
    overlay.toggleAttribute('hidden', !toggle.checked);
    note.hidden = !toggle.checked;
    if (!toggle.checked) { overlay.replaceChildren(); groups.clear(); measurements = []; }
    lastDraw = lastMeasure = -Infinity;
  });
  setZoom(1);

  function groupFor(id) {
    if (groups.has(id)) return groups.get(id);
    const group = svg('g', { class: 'dimension', 'data-dimension': id });
    const outline = svg('path', { class: 'dimension-outline' });
    const line = svg('path', { class: 'dimension-line' });
    const label = svg('g', { class: 'dimension-label' });
    const box = svg('rect', { rx: 3, y: -13, height: 26 });
    const text = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    label.append(box, text); group.append(outline, line); overlay.append(group, label);
    const result = { group, outline, line, label, box, text }; groups.set(id, result); return result;
  }
  function update(now) {
    if (!toggle.checked || document.hidden || now - lastDraw < 32) return;
    lastDraw = now;
    if (now - lastMeasure >= 150) { measurements = measure(camera); lastMeasure = now; }
    const width = renderer.domElement.clientWidth, height = renderer.domElement.clientHeight;
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    for (const entry of groups.values()) { entry.group.style.display = 'none'; entry.label.style.display = 'none'; }
    const occupied = [];
    for (const measurement of measurements) {
      const projected = projectDimension(measurement, camera, width, height);
      if (!projected) continue;
      const [x1, y1] = projected.from, [x2, y2] = projected.to;
      const length = Math.hypot(x2 - x1, y2 - y1);
      if (length < 36) continue;
      const entry = groupFor(measurement.id);
      entry.group.style.display = ''; entry.label.style.display = '';
      entry.group.dataset.metres = measurement.metres.toFixed(6);
      const tx = -(y2 - y1) / length * 6, ty = (x2 - x1) / length * 6;
      let d = `M${x1},${y1}L${x2},${y2}`;
      if (!projected.clippedStart) d += `M${x1 - tx},${y1 - ty}L${x1 + tx},${y1 + ty}`;
      if (!projected.clippedEnd) d += `M${x2 - tx},${y2 - ty}L${x2 + tx},${y2 + ty}`;
      entry.line.setAttribute('d', d); entry.outline.setAttribute('d', d);
      entry.text.textContent = `${measurement.label} ≈ ${measurement.metres.toFixed(2)} m`;
      const labelWidth = 158;
      const x = Math.min(width - labelWidth / 2 - 8, Math.max(labelWidth / 2 + 8, (x1 + x2) / 2));
      let y = Math.min(height - 20, Math.max(20, (y1 + y2) / 2));
      for (const placed of occupied) if (Math.abs(placed.x - x) < labelWidth && Math.abs(placed.y - y) < 30) y = Math.min(height - 20, placed.y + 32);
      occupied.push({ x, y });
      entry.box.setAttribute('x', String(-labelWidth / 2)); entry.box.setAttribute('width', String(labelWidth));
      entry.label.setAttribute('transform', `translate(${x},${y})`);
    }
    // Keep every label above every measurement line.
    for (const entry of groups.values()) overlay.append(entry.label);
  }
  return {
    update,
    getState: () => ({ zoom: camera.zoom, effectiveFov: camera.getEffectiveFOV(), dimensions: toggle.checked, measurements: measurements.map(item => ({ ...item, a: [...item.a], b: [...item.b] })) }),
  };
}
