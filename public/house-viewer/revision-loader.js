import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeModel} from './revision-state.js';
import {setText,t} from './i18n.js';
const $=id=>document.getElementById(id);
const hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
async function checked(url,sha,signal) {
  const response=url.startsWith('house-asset:')?new Response(await window.__HOUSE_FETCH(url,signal)):await fetch(url,{signal});if(!response.ok)throw Error(`HTTP ${response.status}`);
  const bytes=await response.arrayBuffer();
  if(!crypto.subtle)throw Error('HTTPS or localhost is required for asset verification');
  if(hex(await crypto.subtle.digest('SHA-256',bytes))!==sha)throw Error('Asset checksum mismatch');
  return bytes;
}
export async function createRevisionLoader(commit) {
  const response=new Response(JSON.stringify(window.__HOUSE_CATALOG||{revisions:[]}));if(!response.ok)throw Error('Revision catalog unavailable');
  const catalog=await response.json();if(!catalog.revisions?.length)return null;
  const picker=$('revision-select'), builds=$('revision-build'), status=$('revision-status');
  const storageKey=`house-revision:${catalog.projectId}:${location.pathname}`;
  let active=null,generation=0,abort,loading=false,lastReason='',lastError='';const cache=new Map();
  for(const revision of catalog.revisions){const o=new Option(revision.revisionId,revision.revisionId);o.title=revision.title;o.disabled=!revision.selectedBuildId;picker.add(o);}
  $('revision-controls').hidden=false;
  function display() {
    if(!active)return;
    picker.value=active.revisionId;picker.title=`${active.revisionId} · ${active.revision.title}`;builds.replaceChildren();
    for(const [id,b] of Object.entries(active.revision.builds))if(b.artifacts.interactive.status==='ready')builds.add(new Option(id,id));
    builds.value=active.buildId;
    $('revision-title').textContent=`${active.revisionId} · ${active.revision.title}`;
    $('revision-summary').textContent=active.revision.summary||'';
    setText($('revision-validation'),'revisionUnreviewed');
    setText($('revision-parent'),'revisionParent',{parent:active.revision.parentRevisionId||'—'});
    const links=$('revision-outputs');links.replaceChildren();
    for(const [kind,artifact] of Object.entries(active.build.artifacts)) {
      const row=document.createElement('div'),label=document.createElement('span');setText(label,`artifact_${kind}`);row.append(label);
      const value=document.createElement(artifact.url?'a':'span');
      if(artifact.url){value.href='#';value.onclick=event=>{event.preventDefault();window.__HOUSE_OPEN_ARTIFACT(artifact.url,artifact.mime);};}
      setText(value,artifact.url||artifact.currentViewer?'artifactReady':artifact.status==='failed'?'artifactFailed':artifact.status==='building'?'artifactBuilding':'artifactPending');row.append(value);links.append(row);
    }
  }
  function message(key){setText(status,key);status.hidden=!key;}
  async function select(id,buildId) {
    const ticket=++generation;abort?.abort();abort=new AbortController();loading=true;lastError='';message('revisionLoading');
    const revision=catalog.revisions.find(r=>r.revisionId===id);
    const build=revision?.builds[buildId||revision.selectedBuildId];
    if(!build?.scene||!build?.model){loading=false;message('artifactPending');display();return false;}
    buildId=build.buildId;
    if(active?.revisionId===id&&active.buildId===buildId){loading=false;message('');display();return true;}
    let root,committed=false;
    try {
      const key=`${id}:${buildId}:${build.model.sha256}:${build.scene.sha256}`;
      let input=cache.get(key);
      if(input){cache.delete(key);cache.set(key,input);}
      else {
        const [model,scene]=await Promise.all([checked(build.model.url,build.model.sha256,abort.signal),checked(build.scene.url,build.scene.sha256,abort.signal)]);
        input={model,scene:JSON.parse(new TextDecoder().decode(scene))};
        if(ticket!==generation)return false;
        cache.set(key,input);
        while(cache.size>2 || (cache.size>1&&[...cache.values()].reduce((n,v)=>n+v.model.byteLength,0)>96*1024*1024))cache.delete(cache.keys().next().value);
      }
      if(input.scene.revision?.revisionDigest!==revision.revisionDigest||input.scene.revision?.revisionId!==id||input.scene.buildId!==buildId)throw Error('Revision/build identity mismatch');
      const gltf=await new GLTFLoader().parseAsync(input.model.slice(0),'');root=gltf.scene;
      if(ticket!==generation){disposeModel(root);return false;}
      lastReason=commit(root,structuredClone(input.scene));committed=true;
      active={revisionId:id,buildId,revision,build};display();
      const url=new URL(location.href);url.searchParams.set('revision',id);url.searchParams.set('build',buildId);history.replaceState(null,'',url);
      try{localStorage.setItem(storageKey,id);}catch{/* Storage is optional. */}
      message(lastReason==='relocated'?'revisionRelocated':lastReason==='modelOnly'?'revisionModelOnly':'');return true;
    } catch(error) {
      if(root&&!committed)disposeModel(root);
      if(ticket!==generation)return false;
      lastError=error.message;console.warn('Revision selection failed:',error.message);message('revisionError');display();return false;
    } finally {if(ticket===generation)loading=false;}
  }
  picker.onchange=()=>{const id=picker.value;if(active)picker.value=active.revisionId;select(id);};
  builds.onchange=()=>select(active.revisionId,builds.value);
  window.addEventListener('popstate',()=>{const p=new URL(location.href).searchParams;select(p.get('revision')||catalog.defaultRevisionId,p.get('build')||undefined);});
  let stored;try{stored=localStorage.getItem(storageKey);}catch{/* Storage is optional. */}
  const p=new URL(location.href).searchParams,requested=p.get('revision');
  const desired=catalog.revisions.find(r=>r.revisionId===(requested||stored)&&r.selectedBuildId);
  const initial=desired?.revisionId||catalog.defaultRevisionId;
  const wantedBuild=requested===initial?p.get('build')||undefined:undefined;
  const badLink=!!requested&&(!desired||(wantedBuild&&!desired.builds[wantedBuild]?.model));
  const ok=await select(initial,badLink?undefined:wantedBuild);
  if(!ok&&!active&&initial!==catalog.defaultRevisionId)await select(catalog.defaultRevisionId);
  if(badLink&&active)message('revisionFallback');
  if(!active)throw Error(t('revisionInitialError'));
  return {select,getState:()=>({revisionId:active?.revisionId,buildId:active?.buildId,loading,cacheEntries:cache.size,cachedBytes:[...cache.values()].reduce((n,v)=>n+v.model.byteLength,0),lastReason,lastError,defaultRevisionId:catalog.defaultRevisionId,available:catalog.revisions.map(r=>r.revisionId)})};
}
