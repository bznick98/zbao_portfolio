import {initLanguage,setText} from './i18n.js';
initLanguage();
// The viewer never receives a password or key, only short-lived in-memory URLs.
let started = false;
function theme(value) { document.documentElement.dataset.theme = value === 'light' ? 'light' : 'dark'; }
function fail() {
  const message = document.getElementById('load-text');
  setText(message, 'viewerError');
  parent.postMessage({ type: 'house:error' }, location.origin);
}
window.addEventListener('error', fail);
window.addEventListener('unhandledrejection', fail);
window.addEventListener('message', async event => {
  if (event.origin !== location.origin || event.source !== parent || parent === window) return;
  const data = event.data;
  if (data?.type === 'house:theme') { theme(data.theme); return; }
  if (started || data?.type !== 'house:open') return;
  if (![data.scene, data.model].every(url => typeof url === 'string' && url.startsWith(`blob:${location.origin}/`))) return;
  started = true;
  theme(data.theme);
  window.__HOUSE_ASSETS = { scene: data.scene, model: data.model };
  // Reuse the site's font declaration; the browser can reuse its cached fonts.
  const fonts = parent.document.querySelector('link[href^="https://fonts.googleapis.com/css"]');
  if (fonts) document.head.appendChild(fonts.cloneNode());
  try { await import('./main.js'); } catch { fail(); }
});
document.getElementById('lock-page').onclick = () => parent.postMessage({ type: 'house:lock' }, location.origin);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.getElementById('settings').hidden) {
    document.getElementById('settings').hidden = true;
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('menu-toggle').focus();
  }
});
theme('dark');
if (parent === window) {
  setText(document.getElementById('load-text'), 'loginFirst');
  const link = document.createElement('a');
  link.href = '/#house'; setText(link, 'openHouse');
  document.querySelector('.load-card').appendChild(link);
}
