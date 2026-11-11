export { collectWallSurfaces } from './measurement-geometry.js';

export const MIN_ZOOM = 0.65;
export const MAX_ZOOM = 3;
export const clampZoom = value => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(value) ? value : 1));
export function zoomAfterWheel(zoom, delta, mode, viewportHeight) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
  return clampZoom(zoom * Math.exp(-Math.max(-160, Math.min(160, pixels)) * 0.0015));
}
