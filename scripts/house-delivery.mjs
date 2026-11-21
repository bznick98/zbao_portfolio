import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
export async function checked(base,name,expected){
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

export async function loadDelivery(delivery){
 const manifest=await json(path.join(delivery,'site-manifest.json'));
 if(manifest.schema!==1||!/^interactive-[a-f0-9]{12}$/.test(manifest.deliveryId))throw Error('Invalid delivery manifest.');
 const sourceCatalog=JSON.parse(await checked(delivery,'assets/revisions.json',manifest.files['assets/revisions.json']));
 if(sourceCatalog.projectId!==manifest.projectId||sourceCatalog.defaultRevisionId!==manifest.defaultRevisionId)throw Error('Delivery/catalog identity mismatch.');
 return {manifest,catalog:sourceCatalog};
}

export async function collectRevisionAssets(delivery,manifest,catalog,revision,raw){
 function asset(bytes,mime){const sha256=hash(bytes),id='asset-'+sha256;raw.set(id,bytes);return {url:'house-asset:'+id,sha256,mime};}
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
