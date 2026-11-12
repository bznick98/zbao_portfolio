import {createHash,randomBytes,webcrypto} from 'node:crypto';
import {readFile,writeFile,mkdir,cp,readdir,rm,rename,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ITERATIONS,deriveHouseKey} from '../lib/house-crypto.mjs';
globalThis.crypto ??= webcrypto;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const modules=['artifact-modes.js','artifact-modes.css','i18n.js','measurement-geometry.js','dimension-overlays.js','measurement-tools.js','dimension-occlusion.js','wall-surfaces.js','wall-labels.js','dimensions.css','plan-map.js','revision-loader.js','revision-state.js','revisions.css'];
async function checked(base,name,expected){
 if(!expected||name.includes('..')||name.includes('\\')||path.isAbsolute(name))throw Error('Unverified release path: '+name);
 const resolved=await realpath(path.join(base,name));if(!resolved.startsWith(await realpath(base)+path.sep))throw Error('Release path escapes source.');
 const bytes=await readFile(resolved);if(hash(bytes)!==expected)throw Error('Release checksum mismatch: '+name);return bytes;
}
async function checkBuild(build){
 for(const name of ['camera-clearance','layout-sync','web-files','web-browser','wall-dimensions','wall-dimensions-browser'])if(!(await json(path.join(build,`checks/${name}.json`))).passed)throw Error('Workflow check failed: '+name);
 const browser=await json(path.join(build,'checks/web-browser.json'));
 for(const mode of ['desktop','mobile'])if(!browser.interactiveArtifacts?.[mode]?.exactPoseRoundTrip||!browser.interactiveArtifacts[mode]?.measurementTools?.twoPoint3dDistance)throw Error('Interactive Artifacts gates are required.');
 const validation=await json(path.join(build,'checks/gltf-validator.json'));if(validation.issues.numErrors||validation.issues.numWarnings)throw Error('Resolve GLB validation findings before importing.');
}
function integrate(source,from,to){if(!source.includes(from))throw Error('Viewer changed; review integration for: '+from);return source.replaceAll(from,to);}

// A versioned multi-revision delivery is the input; only selected builds ship.
// The catalog, navigation, dimensions, drawings and models all remain encrypted.
export async function importHouse(delivery,password,destination=path.join(root,'public/house-viewer')){
 if(!password||password.length>128)throw Error('Supply a nonempty password through stdin (maximum 128 characters).');
 const manifest=await json(path.join(delivery,'site-manifest.json'));
 if(manifest.schema!==1||!/^interactive-[a-f0-9]{12}$/.test(manifest.deliveryId))throw Error('Invalid delivery manifest.');
 const sourceCatalog=JSON.parse(await checked(delivery,'assets/revisions.json',manifest.files['assets/revisions.json']));
 if(sourceCatalog.projectId!==manifest.projectId||sourceCatalog.defaultRevisionId!==manifest.defaultRevisionId)throw Error('Delivery/catalog identity mismatch.');
 const catalog=structuredClone(sourceCatalog),raw=new Map();
 function asset(bytes,mime){const sha256=hash(bytes),id='asset-'+sha256;raw.set(id,bytes);return {url:'house-asset:'+id,sha256,mime};}
 for(const revision of catalog.revisions){
  const selected=revision.builds[revision.selectedBuildId];if(!selected)throw Error('Selected build is unavailable.');
  if(!/^[a-f0-9]{16}$/.test(selected.buildId))throw Error('Invalid build ID.');
  const build=path.resolve(delivery,'../../builds',selected.buildId);await checkBuild(build);
  const snapshot=await json(path.join(build,'snapshot.json'));
  if(snapshot.projectId!==catalog.projectId||snapshot.buildId!==selected.buildId||snapshot.revision?.revisionDigest!==revision.revisionDigest)throw Error('Build/revision identity mismatch.');
  const sceneBytes=await checked(delivery,selected.scene.url,selected.scene.sha256);
  const scene=JSON.parse(sceneBytes);if(scene.buildId!==selected.buildId||scene.revision?.revisionId!==revision.revisionId||scene.revision?.revisionDigest!==revision.revisionDigest)throw Error('Scene identity mismatch.');
  if(hash(await readFile(path.join(build,'web/assets/scene.json')))!==selected.scene.sha256)throw Error('Scene differs from checked build.');
  const modelBytes=await checked(delivery,selected.model.url,selected.model.sha256);
  if(hash(await readFile(path.join(build,'web/assets/apartment.glb')))!==selected.model.sha256)throw Error('Model differs from checked build.');
  selected.scene=asset(sceneBytes,'application/json');selected.model=asset(modelBytes,'model/gltf-binary');
  for(const [kind,output] of Object.entries(selected.artifacts)){
   if(['map','route'].includes(kind)&&output.url){const name=output.url;Object.assign(output,asset(await checked(delivery,name,manifest.files[name]),'image/svg+xml'));}
   else if(kind==='interactive'){delete output.url;output.currentViewer=true;}
   else if(output.url){delete output.url;output.status='pending';}
  }
  revision.builds={[selected.buildId]:selected};
 }
 const buildId=hash(manifest.deliveryId).slice(0,16),salt=randomBytes(16),key=await deriveHouseKey(password,salt,['encrypt']);
 const temporary=`${destination}.tmp`;await rm(temporary,{recursive:true,force:true});await mkdir(path.join(temporary,buildId),{recursive:true});
 raw.set('catalog',Buffer.from(JSON.stringify(catalog)));
 const files={};
 for(const [name,bytes] of raw){const iv=randomBytes(12),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${buildId}/${name}`)},key,bytes);const file=`${buildId}/${name}.bin`;await writeFile(path.join(temporary,file),Buffer.from(cipher));files[name]={file,iv:[...iv],bytes:cipher.byteLength};}
 for(const [name,digest] of Object.entries(manifest.files))if(name.startsWith('vendor/')||name.startsWith('licenses/')){const bytes=await checked(delivery,name,digest);await mkdir(path.dirname(path.join(temporary,name)),{recursive:true});await writeFile(path.join(temporary,name),bytes);}
 for(const name of ['style.css',...modules])await writeFile(path.join(temporary,name),await checked(delivery,name,manifest.files[name]));
 let main=(await checked(delivery,'main.js',manifest.files['main.js'])).toString();
 main="import {installHouseControls} from './controls.js';\nlet houseControls;\n"+main;
 main=integrate(main,'resize();drawMap();return chosen.reason;','houseControls?.dispose();houseControls=installHouseControls({camera,renderer,root,scene,modes:artifactModes,tools:measurementTools});resize();drawMap();return chosen.reason;');
 main=integrate(main,'window.__walkthrough={get tools()','window.__walkthrough={get controls(){return houseControls;},get tools()');
 main=integrate(main,"fetch('./assets/scene.json')",'fetch(window.__HOUSE_ASSETS.scene)');
 main=integrate(main,"loadAsync('./assets/apartment.glb',",'loadAsync(window.__HOUSE_ASSETS.model,');
 main=integrate(main,"$('loading').remove();","$('loading').remove();parent.postMessage({type:'house:ready'},location.origin);");
 main=integrate(main,'console.error(error);',"parent.postMessage({type:'house:error'},location.origin);console.error(error);");
 await writeFile(path.join(temporary,'main.js'),main);
 let loader=(await checked(delivery,'revision-loader.js',manifest.files['revision-loader.js'])).toString();
 loader=integrate(loader,'const response=await fetch(url,{signal});',"const response=url.startsWith('house-asset:')?new Response(await window.__HOUSE_FETCH(url,signal)):await fetch(url,{signal});");
 loader=integrate(loader,"const response=await fetch('./assets/revisions.json');", "const response=new Response(JSON.stringify(window.__HOUSE_CATALOG||{revisions:[]}));");
 loader=integrate(loader,"if(artifact.url){value.href=artifact.url;value.target='_blank';value.rel='noopener';}","if(artifact.url){value.href='#';value.onclick=event=>{event.preventDefault();window.__HOUSE_OPEN_ARTIFACT(artifact.url,artifact.mime);};}");
 loader=integrate(loader,"artifact.url?'artifactReady'", "artifact.url||artifact.currentViewer?'artifactReady'");
 await writeFile(path.join(temporary,'revision-loader.js'),loader);
 for(const name of ['index.html','bridge.js','theme.css','controls.js','measurements.js'])await cp(path.join(root,'house-viewer',name),path.join(temporary,name));
 await writeFile(path.join(temporary,'release.json'),JSON.stringify({schema:2,buildId,iterations:ITERATIONS,salt:[...salt],files},null,2)+'\n');
 await writeFile(path.join(temporary,'provenance.json'),JSON.stringify({schema:1,sourceDelivery:manifest.deliveryId,sourceManifestSha256:hash(await readFile(path.join(delivery,'site-manifest.json'))),runtime:Object.fromEntries(['main.js',...modules].map(n=>[n,manifest.files[n]])),selectedBuildIds:catalog.revisions.map(r=>r.selectedBuildId),sourceMaterialsPreserved:true},null,2)+'\n');
 await rm(destination,{recursive:true,force:true});await rename(temporary,destination);
 return {buildId,revisions:catalog.revisions.length,encryptedBytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),destination};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Usage: npm run house:import -- /path/to/output/deliveries/interactive-ID (password on stdin)');
 let password='';for await(const chunk of process.stdin)password+=chunk;
 const result=await importHouse(path.resolve(process.argv[2]),password.replace(/\r?\n$/,''));password='';console.log(JSON.stringify(result));
}
