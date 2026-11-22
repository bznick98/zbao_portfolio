import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomBytes,createHash,webcrypto} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHouseKey,decryptHouseFile} from '../lib/house-crypto.mjs';

globalThis.crypto ??= webcrypto;
const root=fileURLToPath(new URL('../',import.meta.url));
const station=process.argv[2];
if(!station)throw Error('Supply the private workstation directory and the release password on stdin.');
const read=async name=>JSON.parse(await readFile(name,'utf8'));
const write=async(name,value)=>{const tmp=name+'.'+randomBytes(8).toString('hex');await writeFile(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(tmp,name);};
let password='';for await(const c of process.stdin)password+=c;
const base=path.join(root,'public/house-viewer'), release=await read(path.join(base,'release.json'));
const releaseKey=await deriveHouseKey(password.trimEnd(),release.salt,['encrypt','decrypt']);
password='';
const catalog=release.files.catalog;
const project=JSON.parse(new TextDecoder().decode(await decryptHouseFile(releaseKey,await readFile(path.join(base,catalog.file)),catalog.iv,release.buildId,'catalog')));
if(project.projectId!=='zhijiang')throw Error('Unexpected House release.');
const privatePath=path.join(station,'submit-access.json');
let access;
try{access=await read(privatePath);}catch(error){
  if(error.code!=='ENOENT')throw error;
  access={token:randomBytes(32).toString('hex'),keyHex:randomBytes(32).toString('hex')};
  await writeFile(privatePath,JSON.stringify(access)+'\n',{flag:'wx',mode:0o600});
}
if(![access.token,access.keyHex].every(s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)))throw Error('Invalid private submit access.');
const iv=randomBytes(12);
const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:Buffer.from(release.buildId+'/submit-access-v1')},releaseKey,Buffer.from(JSON.stringify(access)));
const registry=path.join(root,'server/house-jobs/station.json');
const keys=await read(registry);keys.submitter=createHash('sha256').update(access.token).digest('hex');
await write(path.join(root,'lib/house-submit-grant.json'),{buildId:release.buildId,iv:[...iv],cipher:Buffer.from(cipher).toString('base64')});
await write(registry,keys);
console.log('Submission grant configured for the verified House release.');
