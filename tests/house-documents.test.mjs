import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {webcrypto,randomBytes,createHash} from 'node:crypto';
import {getHouseDocuments,isolateHouseDocument} from '../lib/house-documents.mjs';
import {importHouseDocuments,packageHouseDocuments} from '../scripts/import-house-documents.mjs';
import {deriveHouseKey,decryptHouseFile,ITERATIONS} from '../lib/house-crypto.mjs';
globalThis.crypto??=webcrypto;

test('document picker ignores unsupported IDs, remote resources and duplicates',()=>{
 const good={id:'interior-study',title:'Design study',assetId:'asset-'+'a'.repeat(64),mime:'text/html'};
 const result=getHouseDocuments({documents:{schema:1,items:[good,{...good},{...good,id:'remote'}, {...good,id:'interior-study',assetId:'https://example.invalid/private'}]}});
 assert.deepEqual(result,[good]);assert.deepEqual(getHouseDocuments(null),[]);
});
test('private document policy precedes document scripts and blocks network and forms',()=>{
 const html=isolateHouseDocument('<!doctype html><html><script>window.example=1</script></html>');
 assert.ok(html.indexOf('Content-Security-Policy')<html.indexOf('<script>'));
 assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes("form-action 'none'"));
});
async function fixture(t){
 const dir=await mkdtemp(path.join(os.tmpdir(),'house-documents-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const d=path.join(dir,'source/projects/zhijiang/reference/interior/concepts/tuscan-materials-v2');await mkdir(d,{recursive:true});
 const files={};
 for(const name of ['living-stone-target-v2.png','living-teak-target-v2.png','kitchen-target-v2.png','dining-target-v2.png','living-wide-base.png','kitchen-base.png','dining-base.png']){
  const bytes=Buffer.from('fixture '+name);await writeFile(path.join(d,name),bytes);files[name]=createHash('sha256').update(bytes).digest('hex');
 }
 await writeFile(path.join(d,'manifest.json'),JSON.stringify({files}));
 return dir;
}
test('design study packages only four proposals and three baseline images, rejecting changed source bytes',async t=>{
 const dir=await fixture(t),pack=await packageHouseDocuments(path.join(dir,'source'));
 assert.equal(pack.documents.length,1);assert.equal(pack.documents[0].id,'interior-study');assert.equal(Object.keys(pack.provenance).length,8);
 const html=pack.documents[0].html;assert.ok(html.includes('data:image/png;base64,'));assert.ok(html.includes('尚未精细建模'));assert.ok(!html.includes('<script src='));assert.ok(!html.includes('workflow-data'));
 await writeFile(path.join(dir,'source/projects/zhijiang/reference/interior/concepts/tuscan-materials-v2/kitchen-target-v2.png'),'changed');
 await assert.rejects(packageHouseDocuments(path.join(dir,'source')),/checksum mismatch/);
});
test('document import preserves model ciphertext, authenticates docs, and rejects incorrect password before mutation',async t=>{
 const dir=await fixture(t),dest=path.join(dir,'release'),buildId='0123456789abcdef',salt=randomBytes(16),password='fixture-private-code';
 await mkdir(path.join(dest,buildId),{recursive:true});const key=await deriveHouseKey(password,salt,['encrypt','decrypt']);
 const modelId='asset-'+'b'.repeat(64),catalog={schema:1,revisions:[{revisionId:'0.2',selectedBuildId:'verified-model-build'}]},files={};
 for(const [name,value]of [['catalog',JSON.stringify(catalog)],[modelId,'unchanged model bytes']]){
  const iv=randomBytes(12),bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${buildId}/${name}`)},key,new TextEncoder().encode(value)),file=`${buildId}/${name}.bin`;
  await writeFile(path.join(dest,file),Buffer.from(bytes));files[name]={file,iv:[...iv],bytes:bytes.byteLength};
 }
 const release={schema:2,buildId,iterations:ITERATIONS,salt:[...salt],files};await writeFile(path.join(dest,'release.json'),JSON.stringify(release));
 const before=await readFile(path.join(dest,'release.json')),modelBefore=await readFile(path.join(dest,files[modelId].file));
 const options={reportDirectory:path.join(dir,'reports')};
 await assert.rejects(importHouseDocuments(path.join(dir,'source'),'incorrect',dest,options));
 assert.deepEqual(await readFile(path.join(dest,'release.json')),before);
 await importHouseDocuments(path.join(dir,'source'),password,dest,options);
 const updated=JSON.parse(await readFile(path.join(dest,'release.json'),'utf8')),c=updated.files.catalog;
 assert.deepEqual(await readFile(path.join(dest,files[modelId].file)),modelBefore);
 const opened=JSON.parse(new TextDecoder().decode(await decryptHouseFile(key,await readFile(path.join(dest,c.file)),c.iv,buildId,'catalog')));
 assert.deepEqual(opened.revisions,catalog.revisions);assert.equal(opened.documents.items.length,1);
 const item=opened.documents.items[0],file=updated.files[item.assetId],bytes=await readFile(path.join(dest,file.file));
 const html=new TextDecoder().decode(await decryptHouseFile(key,bytes,file.iv,buildId,item.assetId));assert.ok(html.includes('data:image/png'));
 const changed=Buffer.from(bytes);changed[0]^=1;await assert.rejects(decryptHouseFile(key,changed,file.iv,buildId,item.assetId));
});
