import {initLanguage,setText} from './i18n.js';
initLanguage();
// The viewer receives only a decrypted catalog/asset bytes, never a password or key.
let started = false,sequence=0;const pending=new Map(),artifactUrls=new Set();
function readPrivateAsset(assetId,signal){
 if(signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
 return new Promise((resolve,reject)=>{
  const id=++sequence;
  const cancel=()=>{pending.get(id)?.cleanup();pending.delete(id);parent.postMessage({type:'house:cancel-asset',id},location.origin);reject(new DOMException('Cancelled','AbortError'));};
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>{cancel();},90000);
  pending.set(id,{resolve,reject,cleanup(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);}});
  parent.postMessage({type:'house:asset',id,assetId},location.origin);
 });
}
window.__HOUSE_FETCH=async(url,signal)=>{
 if(!url.startsWith('house-asset:'))throw Error('Invalid private resource.');
 return readPrivateAsset(url.slice('house-asset:'.length),signal);
};
window.__HOUSE_OPEN_ARTIFACT=async(url,mime)=>{
 const preview=window.open('about:blank','_blank');if(!preview)return;
 preview.opener=null;
 try{const bytes=await window.__HOUSE_FETCH(url);const blob=URL.createObjectURL(new Blob([bytes],{type:mime}));artifactUrls.add(blob);preview.location.replace(blob);}catch{preview.close();}
};
addEventListener('pagehide',()=>{for(const [id,item] of pending){item.cleanup();item.reject(new DOMException('House closed','AbortError'));parent.postMessage({type:'house:cancel-asset',id},location.origin);}pending.clear();for(const url of artifactUrls)URL.revokeObjectURL(url);artifactUrls.clear();});
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
  if(data?.type==='house:asset-result'){
   const item=pending.get(data.id);if(!item)return;pending.delete(data.id);item.cleanup();
   if(data.error)item.reject(new Error(data.error));else if(data.bytes instanceof ArrayBuffer)item.resolve(data.bytes);else item.reject(new Error('Invalid resource response.'));return;
  }
  if (data?.type === 'house:theme') { theme(data.theme); return; }
  if (started || data?.type !== 'house:open') return;
  if (!data.catalog && ![data.scene, data.model].every(url => typeof url === 'string' && url.startsWith(`blob:${location.origin}/`))) return;
  started = true;
  theme(data.theme);
  window.__HOUSE_CATALOG = data.catalog;
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
