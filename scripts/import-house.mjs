import {checked,loadDelivery,collectRevisionAssets} from './house-delivery.mjs';
import {createHash,randomBytes,webcrypto} from 'node:crypto';
import {readFile,writeFile,mkdir,cp,rm,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ITERATIONS,deriveHouseKey} from '../lib/house-crypto.mjs';
globalThis.crypto ??= webcrypto;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const modules=['artifact-modes.js','artifact-modes.css','i18n.js','measurement-geometry.js','dimension-overlays.js','dimension-layout.js','dimension-filter.js','dimension-text.js','measurement-tools.js','dimension-occlusion.js','wall-surfaces.js','dimensions.css','plan-map.js','revision-loader.js','revision-state.js','revisions.css'];
function integrate(source,from,to){if(!source.includes(from))throw Error('Viewer changed; review integration for: '+from);return source.replaceAll(from,to);}

export async function writeHouseViewer(delivery,manifest,temporary){
 for(const [name,digest] of Object.entries(manifest.files))if(name.startsWith('vendor/')||name.startsWith('licenses/')){const bytes=await checked(delivery,name,digest);await mkdir(path.dirname(path.join(temporary,name)),{recursive:true});await writeFile(path.join(temporary,name),bytes);}
 const viewerFiles = manifest.files['model-teleport.js'] ? [...modules,'model-teleport.js'] : [...modules];
 const reviewModules=['suggestions.js','suggestion-region.js','suggestion-store.js','suggestions.css'];
 const hasReview=Boolean(manifest.files['suggestions.js']);
 if(hasReview)viewerFiles.push(...reviewModules);
 if(manifest.files['toolbar.js'])viewerFiles.push('toolbar.js');
 for(const name of ['style.css',...viewerFiles])await writeFile(path.join(temporary,name),await checked(delivery,name,manifest.files[name]));
 if(!manifest.files['toolbar.js']){
  for(const name of ['toolbar.js','artifact-modes.css','revisions.css'])await cp(path.join(root,'public/house-viewer',name),path.join(temporary,name));
 }
 let main=(await checked(delivery,'main.js',manifest.files['main.js'])).toString();
 const hasPinHooks=main.includes('suggestions?.update()');
 if(hasReview && hasPinHooks && !(await readFile(path.join(temporary,'suggestion-region.js'),'utf8')).includes('export function captureStroke(')){
  for(const name of reviewModules)await cp(path.join(root,'public/house-viewer',name),path.join(temporary,name));
 }
 if(!hasPinHooks){
  // Bring frozen pre-pin deliveries forward while keeping their checked model assets.
  for(const name of [...reviewModules,'artifact-modes.css','revisions.css'])await cp(path.join(root,'public/house-viewer',name),path.join(temporary,name));
  const context="getContext:()=>({data,scene,tools:measurementTools,modes:artifactModes,canvas:renderer.domElement,contains:pointIn,renderFrame:()=>{renderPass.camera=ao.camera=artifactModes.camera;composer.render();}})";
  if(hasReview){
   main=integrate(main,'suggestions?.modelChanged();','');
   main=integrate(main,'getContext:()=>({data,modes:artifactModes,canvas:renderer.domElement,contains:pointIn,renderFrame:()=>composer.render()})',context);
  }else{
   main="import {installSuggestions} from './suggestions.js';\nlet suggestions;\n"+main;
   main=integrate(main,"$('loading').remove();",`suggestions=installSuggestions({${context},selectRevision:(id,build)=>revisionLoader?.select(id,build),restorePose,clearInput});\n $('loading').remove();`);
  }
  main=integrate(main,'resize();drawMap();return chosen.reason;','suggestions?.modelChanged();resize();drawMap();return chosen.reason;');
  main=integrate(main,'measurementTools?.update(now);composer.render();','measurementTools?.update(now);suggestions?.update();composer.render();');
  main=main.replace('canTeleport:()=>!tools?.isMeasuring','canTeleport:()=>!tools?.isMeasuring && !suggestions?.isPicking');
 }
 main="import {installHouseControls} from './controls.js';\nlet houseControls;\n"+main;
 main="import {prepareFixedLayout} from './fixed-layout.js';\n"+main;
 main=integrate(main,'const {obstacles,count}=prepareRoot(root,info);','prepareFixedLayout(root);const {obstacles,count}=prepareRoot(root,info);');
 main=integrate(main,'resize();drawMap();return chosen.reason;','houseControls?.dispose();houseControls=installHouseControls({camera,renderer,root,scene,modes:artifactModes,tools:measurementTools});resize();drawMap();return chosen.reason;');
 main=integrate(main,'window.__walkthrough={get tools()','window.__walkthrough={get controls(){return houseControls;},get tools()');
 main=integrate(main,"fetch('./assets/scene.json')",'fetch(window.__HOUSE_ASSETS.scene)');
 main=integrate(main,"loadAsync('./assets/apartment.glb',",'loadAsync(window.__HOUSE_ASSETS.model,');
 main=integrate(main,"$('loading').remove();","$('loading').remove();parent.postMessage({type:'house:ready'},location.origin);");
 main=integrate(main,'console.error(error);',"parent.postMessage({type:'house:error'},location.origin);console.error(error);");
 const storePath=path.join(temporary,'suggestion-store.js');
 const store=await readFile(storePath,'utf8');
 if(!store.includes('scopeResolution:')){
   const guidance=await readFile(path.join(root,'house-viewer/suggestion-scope.json'),'utf8');
   await writeFile(storePath,integrate(store,'    suggestions\n  };','    scopeResolution: '+JSON.stringify(JSON.parse(guidance))+',\n    suggestions\n  };'));
 }
 await writeFile(path.join(temporary,'main.js'),main);
 let loader=(await checked(delivery,'revision-loader.js',manifest.files['revision-loader.js'])).toString();
 loader=integrate(loader,'const response=await fetch(url,{signal});',"const response=url.startsWith('house-asset:')?new Response(await window.__HOUSE_FETCH(url,signal)):await fetch(url,{signal});");
 loader=integrate(loader,"const response=await fetch('./assets/revisions.json');", "const response=new Response(JSON.stringify(window.__HOUSE_CATALOG||{revisions:[]}));");
 loader=integrate(loader,"if(artifact.url){value.href=artifact.url;value.target='_blank';value.rel='noopener';}","if(artifact.url){value.href='#';value.onclick=event=>{event.preventDefault();window.__HOUSE_OPEN_ARTIFACT(artifact.url,artifact.mime);};}");
 loader=integrate(loader,"artifact.url?'artifactReady'", "artifact.url||artifact.currentViewer?'artifactReady'");
 const oldMessage='function message(key){setText(status,key);status.hidden=!key;}';
 if(loader.includes(oldMessage))loader=integrate(loader,oldMessage,"let timer;function message(key){clearTimeout(timer);setText(status,key);status.hidden=!key;if(['revisionRelocated','revisionModelOnly','revisionFallback'].includes(key))timer=setTimeout(()=>{status.hidden=true;},3500);}");
 await writeFile(path.join(temporary,'revision-loader.js'),loader);
 let modes=(await checked(delivery,'artifact-modes.js',manifest.files['artifact-modes.js'])).toString();
 modes=integrate(modes,'object.visible && SHELL_LAYERS.has(layer)','object.visible && (SHELL_LAYERS.has(layer) || object.userData.fixedFitout)');
 modes=integrate(modes,'const source = Array.isArray(object.material)', 'if (object.userData.fixedFitout) return;\n    const source = Array.isArray(object.material)');
 await writeFile(path.join(temporary,'artifact-modes.js'),modes);
 for(const name of ['index.html','bridge.js','theme.css','controls.js','measurements.js','fixed-layout.js'])await cp(path.join(root,'house-viewer',name),path.join(temporary,name));
 return Object.fromEntries(['main.js',...viewerFiles].map(n=>[n,manifest.files[n]]));
}

// A versioned multi-revision delivery is the input; only selected builds ship.
// The catalog, navigation, dimensions, drawings and models all remain encrypted.
export async function importHouse(delivery,password,destination=path.join(root,'public/house-viewer')){
 if(!password||password.length>128)throw Error('Supply a nonempty password through stdin (maximum 128 characters).');
 const {manifest,catalog}=await loadDelivery(delivery);
 const raw=new Map();
 for(const revision of catalog.revisions)await collectRevisionAssets(delivery,manifest,catalog,revision,raw);
 const buildId=hash(manifest.deliveryId).slice(0,16),salt=randomBytes(16),key=await deriveHouseKey(password,salt,['encrypt']);
 const temporary=`${destination}.tmp`;await rm(temporary,{recursive:true,force:true});await mkdir(path.join(temporary,buildId),{recursive:true});
 raw.set('catalog',Buffer.from(JSON.stringify(catalog)));
 const files={};
 for(const [name,bytes] of raw){const iv=randomBytes(12),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${buildId}/${name}`)},key,bytes);const file=`${buildId}/${name}.bin`;await writeFile(path.join(temporary,file),Buffer.from(cipher));files[name]={file,iv:[...iv],bytes:cipher.byteLength};}
 const runtime=await writeHouseViewer(delivery,manifest,temporary);
 await writeFile(path.join(temporary,'release.json'),JSON.stringify({schema:2,buildId,iterations:ITERATIONS,salt:[...salt],files},null,2)+'\n');
 await writeFile(path.join(temporary,'provenance.json'),JSON.stringify({schema:1,sourceDelivery:manifest.deliveryId,sourceManifestSha256:hash(await readFile(path.join(delivery,'site-manifest.json'))),runtime,selectedBuildIds:catalog.revisions.map(r=>r.selectedBuildId),sourceMaterialsPreserved:true},null,2)+'\n');
 await rm(destination,{recursive:true,force:true});await rename(temporary,destination);
 return {buildId,revisions:catalog.revisions.length,encryptedBytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),destination};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Usage: npm run house:import -- /path/to/output/deliveries/interactive-ID (password on stdin)');
 let password='';for await(const chunk of process.stdin)password+=chunk;
 const result=await importHouse(path.resolve(process.argv[2]),password.replace(/\r?\n$/,''));password='';console.log(JSON.stringify(result));
}
