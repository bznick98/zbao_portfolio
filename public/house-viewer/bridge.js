// The viewer never receives a password or key, only short-lived in-memory URLs.
let started = false;
function theme(value) { document.documentElement.dataset.theme = value === 'light' ? 'light' : 'dark'; }
function fail() {
  document.getElementById('load-text').textContent = '无法打开三维视图，请返回页面重试。';
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
theme('dark');
if (parent === window) {
  document.getElementById('load-text').textContent = '请先在 House 页面输入访问密码。';
  const link = document.createElement('a');
  link.href = '/#house'; link.textContent = 'Open House →';
  document.querySelector('.load-card').appendChild(link);
}
