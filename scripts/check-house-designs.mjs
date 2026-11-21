import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {deriveHouseKey,decryptHouseFile} from '../lib/house-crypto.mjs';
const require=createRequire(import.meta.url);let playwright;
try{playwright=require('playwright')}catch{playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
let password='';for await(const chunk of process.stdin)password+=chunk;password=password.trim();if(!password)throw Error('Password required on stdin');
const origin=process.argv[2]||'http://127.0.0.1:3061',out=path.resolve('artifacts/house-documents');await mkdir(out,{recursive:true});
const release=JSON.parse(await readFile('public/house-viewer/release.json','utf8')),key=await deriveHouseKey(password,release.salt),f=release.files.catalog;
const catalog=JSON.parse(new TextDecoder().decode(await decryptHouseFile(key,await readFile('public/house-viewer/'+f.file),f.iv,release.buildId,'catalog')));
const report=catalog.documents.items.find(d=>d.id==='design-report-0.5');assert.ok(report?.pages.length>1);
const pdfFile=release.files[report.assetId].file;
const studyFile=release.files[catalog.documents.items.find(d=>d.id==='interior-study').assetId].file;
const browser=await playwright.chromium.launch(process.platform==='win32'?{channel:'msedge',headless:true}:{headless:true});
const checks=[],errors=[];
try{
for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},hasTouch:width<500});
 page.on('pageerror',e=>errors.push(e.message));const downloads=[];page.on('request',r=>{if(r.url().endsWith('.bin'))downloads.push(r.url())});
 await page.goto(origin+'/#house');await page.getByLabel('Password / 访问密码').waitFor();assert.equal(downloads.length,0);
 if(width===1440){await page.getByLabel('Password / 访问密码').fill('incorrect');await page.getByRole('button',{name:'Enter the house'}).click();await page.getByRole('alert').waitFor();assert.ok(downloads.every(url=>url.endsWith(f.file)));}
 await page.getByLabel('Password / 访问密码').fill(password);await page.getByRole('button',{name:'Enter the house'}).click();
 const walkElement=await page.locator('iframe.house-frame').elementHandle(),walk=await walkElement.contentFrame();
 await walk.waitForFunction(()=>window.__walkthrough?.ready,null,{timeout:120000});
 assert.ok(!downloads.some(u=>u.endsWith(studyFile)||u.endsWith(pdfFile)));
 await walk.evaluate(()=>__walkthrough.revisions.select('0.5'));
 const fixedPose=await walk.evaluate(()=>__walkthrough.getState().position);
 await walk.locator('#menu-toggle').click();await walk.locator('#project-documents').click();
 const pic=page.locator('.house-report-page img');await pic.waitFor();await pic.evaluate(el=>el.decode());
 assert.equal(await pic.getAttribute('alt'),report.pages[0].title);
 await page.getByRole('button',{name:'下一页'}).click();await page.getByAltText(report.pages[1].title).evaluate(el=>el.decode());
 assert.ok(!downloads.some(u=>u.endsWith(pdfFile)),'PDF is fetched only on download');
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'PDF',exact:true}).click();const downloaded=await dl;
 assert.ok(downloaded.suggestedFilename().includes('0.5'));assert.equal(createHash('sha256').update(await readFile(await downloaded.path())).digest('hex'),report.assetId.slice(6));assert.ok(downloads.some(u=>u.endsWith(pdfFile)));
 assert.ok(!downloads.some(u=>u.endsWith(studyFile)));await page.getByRole('button',{name:'返回 3D'}).click();
 assert.deepEqual(await walk.evaluate(()=>__walkthrough.getState().position),fixedPose);
 await walk.evaluate(()=>__walkthrough.revisions.select('0.1'));await walk.locator('#menu-toggle').click();await walk.locator('#project-documents').click();
 await page.getByText('此版本尚未发布设计报告。').waitFor();await page.getByRole('button',{name:'返回 3D'}).click();
 await walk.evaluate(()=>__walkthrough.revisions.select('0.2'));await walk.evaluate(()=>__walkthrough.go('living_wide'));
 const before=await walk.evaluate(()=>{const {position,yaw,pitch,fov,revisionId}=__walkthrough.getState();return {position,yaw,pitch,fov,revisionId}});
 await walk.locator('#menu-toggle').click();await walk.locator('#project-documents').click();
 await page.locator('iframe.house-document-frame').waitFor({timeout:120000});
 const doc=await(await page.locator('iframe.house-document-frame').elementHandle()).contentFrame();
 await doc.waitForFunction(()=>document.getElementById('hero')?.naturalWidth===1536);
 assert.ok(downloads.some(u=>u.endsWith(studyFile)));assert.equal(await page.locator('iframe.house-frame').getAttribute('inert'),'');
 assert.equal(await doc.evaluate(()=>{try{return parent.document.title}catch{return 'blocked'}}),'blocked');
 for(const room of ['living','dining','kitchen']){
  await doc.locator(`[data-room="${room}"]`).click();
  for(const mode of ['base','target']){await doc.locator(`[data-mode="${mode}"]`).click();await doc.locator('#hero').evaluate(el=>el.decode());assert.equal(await doc.locator('#hero').evaluate(el=>el.naturalWidth),1536);}
 }
 await doc.locator('[data-room="living"]').click();const stone=await doc.locator('#hero').getAttribute('src');await doc.locator('[data-floor="teak"]').click();await doc.locator('#hero').evaluate(el=>el.decode());assert.notEqual(await doc.locator('#hero').getAttribute('src'),stone);
 assert.equal(await doc.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await doc.locator('[data-floor="stone"]').click();await doc.locator('#hero').evaluate(el=>el.decode());await page.screenshot({path:path.join(out,`designs-${width}.png`),fullPage:true});
 await page.getByRole('button',{name:'返回 3D'}).click();assert.equal(await page.locator('iframe.house-document-frame').count(),0);
 const after=await walk.evaluate(()=>{const {position,yaw,pitch,fov,revisionId}=__walkthrough.getState();return {position,yaw,pitch,fov,revisionId}});assert.deepEqual(after,before);
 await walk.locator('#menu-toggle').click();await walk.locator('#project-documents').click();await page.locator('iframe.house-document-frame').waitFor();
 await page.getByRole('button',{name:'Lock house / 锁定'}).click();await page.getByLabel('Password / 访问密码').waitFor();assert.equal(await page.locator('iframe').count(),0);
 checks.push({width,revision05Pdf:true,revision01Empty:true,revision02Study:true,studyLoadedOnlyOnRequest:true,allViews:true,floorToggle:true,sandboxIsolation:true,posePreserved:true,lockClearsFrames:true});await page.close();
}
assert.deepEqual(errors,[]);await writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks}));
}finally{await browser.close()}
