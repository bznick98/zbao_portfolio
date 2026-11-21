import {createHash,randomBytes,webcrypto} from 'node:crypto';
import {readFile,writeFile,rename,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHouseKey,decryptHouseFile,ITERATIONS,MAX_HOUSE_FILES} from '../lib/house-crypto.mjs';
globalThis.crypto??=webcrypto;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const destination=fileURLToPath(new URL('../public/house-viewer/',import.meta.url));

export async function importReport(manifestFile,password,dir=destination) {
  const source=await realpath(path.dirname(manifestFile)),report=JSON.parse(await readFile(manifestFile,'utf8'));
  const releasePath=path.join(dir,'release.json'),release=JSON.parse(await readFile(releasePath,'utf8'));
  if(release.schema!==2||release.iterations!==ITERATIONS||!password)throw Error('Existing private House release required');
  const key=await deriveHouseKey(password,release.salt,['encrypt','decrypt']),old=release.files.catalog;
  const catalog=JSON.parse(new TextDecoder().decode(await decryptHouseFile(key,await readFile(path.join(dir,old.file)),old.iv,release.buildId,'catalog')));
  const revision=catalog.revisions.find(r=>r.revisionId===report.revisionId);
  if(!revision||report.schema!==1||catalog.projectId!==report.projectId||revision.revisionDigest!==report.revisionDigest)throw Error('Report is for a different project or frozen model.');
  if(!report.title||!Array.isArray(report.pages)||!report.pages.length)throw Error('Missing titled report pages');
  const data=new Map();
  async function stage(item,format) {
    const file=await realpath(path.resolve(source,item.path));
    if(!file.startsWith(source+path.sep))throw Error('Path escapes report directory');
    const bytes=await readFile(file),signature=format==='pdf'?'255044462d':'ffd8ff';
    if(!bytes.toString('hex',0,signature.length/2).startsWith(signature)||digest(bytes)!==item.sha256)throw Error('Report file changed: '+item.path);
    const id='asset-'+item.sha256;
    if(!release.files[id])data.set(id,bytes);
    return id;
  }
  const id='design-report-'+revision.revisionId;
  const entry={id,kind:'design-report',projectId:catalog.projectId,revisionId:revision.revisionId,revisionDigest:revision.revisionDigest,title:report.title,mime:'application/pdf',assetId:await stage(report.pdf,'pdf'),pages:[]};
  for(const page of report.pages)entry.pages.push({title:page.title,assetId:await stage(page,'jpeg')});
  const items=catalog.documents?.items||[];
  if(items.some(item=>JSON.stringify(item)===JSON.stringify(entry)))return entry;
  catalog.documents={schema:1,updatedAt:new Date().toISOString(),items:[...items.filter(item=>item.id!==id),entry]};
  data.set('catalog',Buffer.from(JSON.stringify(catalog)));
  if(new Set([...Object.keys(release.files),...data.keys()]).size>MAX_HOUSE_FILES)throw Error('Release file limit exceeded');
  // A digest-specific catalog path switches atomically with the manifest. Older open tabs keep their catalog and assets.
  for(const [name,bytes] of data) {
    const iv=randomBytes(12);
    const cipher=Buffer.from(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:Buffer.from(release.buildId+'/'+name)},key,bytes));
    const file=release.buildId+'/'+(name==='catalog'?'catalog-'+digest(cipher):name)+'.bin';
    if(digest(Buffer.from(await decryptHouseFile(key,cipher,iv,release.buildId,name)))!==digest(bytes))throw Error('Encryption verification failed');
    await writeFile(path.join(dir,file),cipher);release.files[name]={file,iv:[...iv],bytes:cipher.length};
  }
  await writeFile(releasePath+'.tmp',JSON.stringify(release,null,2)+'\n');await rename(releasePath+'.tmp',releasePath);
  return entry;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let password='';for await(const chunk of process.stdin)password+=chunk;
  const item=await importReport(path.resolve(process.argv[2]),password.trimEnd());console.log('Report ready',item.revisionId,item.pages.length);
}
