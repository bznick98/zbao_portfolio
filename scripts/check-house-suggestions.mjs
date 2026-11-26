import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require=createRequire(import.meta.url);
let playwright;
try {playwright=require(process.env.PLAYWRIGHT_MODULE || 'playwright');}
catch {playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
let password='';
for await (const chunk of process.stdin) password+=chunk;
password=password.trim();
if(!password)throw Error('Supply the House password on stdin.');
const origin=process.argv[2] || 'http://127.0.0.1:3061';
const browser=await playwright.chromium.launch(process.platform==='win32'?{channel:'msedge'}:{args:['--enable-unsafe-swiftshader']});
const sample=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1sAAAAASUVORK5CYII=','base64');
const errors=[];
const artifacts=path.resolve('artifacts/house');await mkdir(artifacts,{recursive:true});
try {
  for (const width of [1250,390]) {
    const mobile=width<500,context=await browser.newContext({viewport:{width,height:mobile?844:850},hasTouch:mobile});
    const page=await context.newPage();
    await page.addInitScript(()=>{
      document.addEventListener('DOMContentLoaded',()=>{
        const quality=document.getElementById('quality');
        if(quality){quality.value='low';quality.dispatchEvent(new Event('change'));}
      });
    });
    console.log('Testing',width,'px');
    page.on('pageerror',e=>errors.push(e.message));
    async function unlock() {
      await page.getByLabel('Password / 访问密码').fill(password);
      await page.getByRole('button',{name:'Enter the house'}).click();
      const frameEl=await page.locator('iframe.house-frame').elementHandle();
      const frame=await frameEl.contentFrame();
      await frame.waitForFunction(()=>window.__walkthrough?.ready,null,{timeout:120000});
      return frame;
    }
    await page.goto(origin+'/#house');
    let frame=await unlock();console.log('House unlocked');
    const id=k=>frame.locator('#'+k);
    async function list(){await id('suggestions-open').click();await frame.locator('.sg-list').waitFor({state:'attached'});}
    async function surfacePoint(offset=0) {
      const local=await frame.evaluate(async offset=>{
        const {pickSurface}=await import('./suggestion-region.js');
        const canvas=document.querySelector('#stage canvas'),box=canvas.getBoundingClientRect();
        const modes=__walkthrough.modes, candidates=[];
        for(const v of [.48,.56,.65,.37,.75,.28])for(const u of [.35,.48,.24,.59,.15,.70]){
          const x=Math.round(box.left+box.width*u),y=Math.round(box.top+box.height*v);
          const ctx={modes,data:{rooms:[]}};
          const inside=[[-4,-4],[4,-4],[0,0],[-4,4],[4,4]].every(([dx,dy])=>document.elementFromPoint(x+dx,y+dy)===canvas &&
            pickSurface(ctx,[(x+dx-box.left)/box.width,(y+dy-box.top)/box.height]));
          if(inside)candidates.push({x:x-box.left,y:y-box.top});
        }
        if(!candidates.length)throw Error('No visible surface at test points');
        return candidates[offset%candidates.length];
      },offset);
      const box=await frame.locator('#stage canvas').boundingBox();
      return {x:box.x+local.x,y:box.y+local.y};
    }
    async function point(offset=0) {
      const {x,y}=await surfacePoint(offset);
      if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    }
    async function cabinetPoint(){
      const local=await frame.evaluate(async()=>{
        const THREE=await import('three'),{pickSurface}=await import('./suggestion-region.js');
        const modes=__walkthrough.modes,canvas=document.querySelector('#stage canvas'),box=canvas.getBoundingClientRect();
        const centers=[];
        modes.activeRoot.traverseVisible(node=>{
          if(node.isMesh && node.userData.layer==='Joinery'){
            node.geometry.computeBoundingBox();
            centers.push(node.localToWorld(node.geometry.boundingBox.getCenter(new THREE.Vector3())).project(modes.camera));
          }
        });
        for(const center of centers){
          const uv=[(1+center.x)/2,(1-center.y)/2],x=uv[0]*box.width,y=uv[1]*box.height;
          if(document.elementFromPoint(x+box.left,y+box.top)!==canvas)continue;
          const hit=pickSurface({modes,data:{rooms:[]}},uv);
          if(hit?.object.sourceId && hit.object.layer==='Joinery')return {x,y};
        }
        throw Error('No visible CAD cabinet');
      });
      const box=await frame.locator('#stage canvas').boundingBox();return {x:box.x+local.x,y:box.y+local.y};
    }
    async function orbit() {
      const p=await surfacePoint(),end={x:p.x+35,y:p.y+22};
      if(mobile){
        const cdp=await context.newCDPSession(page);
        for(const [type,q] of [['touchStart',p],['touchMove',end],['touchEnd',null]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:q?[q]:[]});
        await cdp.detach();
      }else{await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,p.y,{steps:3});await page.mouse.move(end.x,end.y,{steps:4});await page.mouse.up();}
    }
    if(!mobile){
      for(const narrow of [320,768,900,1024]) {
        await page.setViewportSize({width:narrow,height:830});
        const header=await frame.evaluate(()=>{
          const box=s=>document.querySelector(s).getBoundingClientRect();
          const view=box('.view-controls'),tools=box('.common-tools'),menu=box('#menu-toggle');
          return {view:view.toJSON(),tools:tools.toJSON(),menu:menu.toJSON(),width:innerWidth,fits:view.top===menu.top && Math.abs((view.left+view.right)/2-innerWidth/2)<1 && view.right<=menu.left && tools.right<=view.left && tools.top===menu.top};
        });
        assert.ok(header.fits,'top toolbar fits '+narrow+'px '+JSON.stringify(header));
      }
      await page.setViewportSize({width,height:850});
    }
    await frame.evaluate(()=>__walkthrough.revisions.select('0.5'));
    await id('mode-model').click();
    const top=await frame.evaluate(()=>['.artifact-modes','#revision-controls','#menu-toggle','.common-tools'].map(s=>{
      const b=document.querySelector(s).getBoundingClientRect();return {top:b.top,right:b.right,left:b.left,bottom:b.bottom};
    }));
    assert.equal(top[0].top,top[2].top);assert.equal(top[1].top,top[0].top);
    if(mobile){assert.ok(top[1].right<top[2].left);assert.equal(top[3].top,top[0].top);await id('tools-toggle').click();assert.ok(await id('language-toggle').isVisible());await id('tools-toggle').click();}
    const annotations=()=>frame.evaluate(()=>{
      const group=__walkthrough.modes.activeRoot.parent.getObjectByName('Suggestion annotations');
      return group.children.map(o=>({id:o.userData.noteId,type:o.type,visible:o.visible}));
    });
    const tap=async({x,y})=>mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y);
    assert.equal(await frame.locator('.sg-count').innerText(),'0');
    const bar=await frame.locator('.sg-bar').boundingBox(),canvasBox=await frame.locator('#stage canvas').boundingBox();
    assert.ok(canvasBox.y+canvasBox.height-bar.y-bar.height<=20);
    if(mobile){
      await id('mode-walk').click();await id('suggestion-new').click();
      const pad=await id('joystick').boundingBox(),sheet=await id('suggestions-panel').boundingBox();
      assert.ok(pad && pad.y+pad.height<sheet.y,'joystick remains reachable above the sheet');
      await id('suggestion-point').click();await point();await id('suggestion-text').waitFor();
      page.once('dialog',d=>d.accept());await id('suggestions-close').click();await id('suggestions-close').click();await id('mode-model').click();
    }
    await id('suggestion-new').click();assert.equal(await frame.locator(':modal').count(),0);
    assert.equal(await id('suggestion-object').getAttribute('aria-pressed'),'true');await id('suggestion-point').click();
    const before=await frame.evaluate(()=>__walkthrough.modes.getState().modelView.position);await orbit();
    assert.notDeepEqual(await frame.evaluate(()=>__walkthrough.modes.getState().modelView.position),before);
    assert.equal(await id('suggestion-text').count(),0);
    await tap(await cabinetPoint());await id('suggestion-text').fill('Raise this cabinet.');
    await id('suggestion-drop').evaluate((zone,b64)=>{
      const bytes=Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0)),transfer=new DataTransfer();
      transfer.items.add(new File([bytes],'wood.png',{type:'image/png'}));
      zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    },sample.toString('base64'));
    await frame.locator('.sg-photo img').waitFor();assert.match(await id('suggestion-save').innerText(),/^Save( edit)?$/);await id('suggestion-save').click();
    await frame.locator('.sg-item').filter({hasText:'Raise this cabinet.'}).waitFor();
    await id('suggestion-new').click();await id('suggestion-draw').click();
    const p=await surfacePoint(3);
    const start={x:p.x-10,y:p.y-4},end={x:p.x+12,y:p.y+8};
    const still=await frame.evaluate(()=>__walkthrough.modes.getState().modelView.position);
    if(mobile){
      const cdp=await context.newCDPSession(page);
      for(const [type,q] of [['touchStart',start],['touchMove',p],['touchMove',end],['touchEnd',null]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:q?[q]:[]});
      await cdp.detach();
    }else{
      await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(p.x,p.y,{steps:3});await page.mouse.move(end.x,end.y,{steps:4});
      await frame.waitForFunction(()=>__walkthrough.modes.activeRoot.parent.getObjectByName('Suggestion brush').children.length>0);await page.mouse.up();
    }
    assert.deepEqual(await frame.evaluate(()=>__walkthrough.modes.getState().modelView.position),still);
    await id('suggestion-text').fill('Change the finish along this stroke.');
    const chooser=page.waitForEvent('filechooser');await id('suggestion-drop').click();
    await (await chooser).setFiles({name:'detail.png',mimeType:'image/png',buffer:sample});
    await frame.locator('.sg-photo img').waitFor();
    await id('suggestion-save').click();await frame.locator('.sg-item').filter({hasText:'Change the finish'}).waitFor();
    await id('suggestions-close').click();
    let marks=await annotations();assert.equal(marks.filter(o=>o.type==='Sprite').length,2);assert.ok(marks.some(o=>o.type==='Mesh'&&o.visible));
    // Click the physical selected area while the list is closed.
    await tap(p);await id('suggestion-text').waitFor();
    assert.equal(await id('suggestion-text').inputValue(),'Change the finish along this stroke.');
    assert.match(await id('suggestions-title').innerText(),/^#2/);
    await id('suggestions-close').click();
    await id('suggestion-new').click();await tap(await cabinetPoint());await id('suggestion-text').fill('Change the entire unit.');
    const clearFooter=await frame.evaluate(()=>{
      const box=s=>document.querySelector(s).getBoundingClientRect(),reset=box('#model-tools');
      const overlaps=b=>reset.left<b.right && reset.right>b.left && reset.bottom>b.top && reset.top<b.bottom;
      return !overlaps(box('.sg-panel')) && !overlaps(box('.sg-bar'));
    });
    assert.ok(clearFooter,'model actions and suggestions have separate space');
    if(!mobile){
      await page.setViewportSize({width:768,height:850});
      const gap=await frame.evaluate(()=>document.querySelector('.sg-panel').getBoundingClientRect().left-document.querySelector('#model-tools').getBoundingClientRect().right);
      assert.ok(gap>=0,'tablet editor and model controls have separate space');
      await page.setViewportSize({width,height:850});
    }
    await page.screenshot({path:path.join(artifacts,'suggestion-object-editor-'+width+'.png')});
    await id('suggestion-save').click();await frame.locator('.sg-item').filter({hasText:'entire unit'}).waitFor();
    assert.equal(await frame.locator('.sg-count').innerText(),'3');
    assert.ok(await frame.evaluate(()=>__walkthrough.modes.activeRoot.parent.getObjectByName('Suggestion annotations').children.some(o=>o.userData.member && o.visible && !o.material.depthTest)));
    await id('suggestions-close').click();await frame.evaluate(()=>__walkthrough.revisions.select('0.1'));
    assert.equal((await annotations()).length,0);await page.reload();frame=await unlock();await list();
    assert.equal(await frame.locator('.sg-item').count(),3);
    await frame.locator('.sg-item').filter({hasText:'Raise this cabinet.'}).click();
    await frame.waitForFunction(()=>__walkthrough.revisions.getState().revisionId==='0.5' && document.querySelector('#suggestion-save:not(:disabled)'));
    assert.equal(await frame.locator('.sg-photo img').getAttribute('alt'),'wood.png');
    await id('suggestion-text').fill('Cabinet depth 0.60 m.');await id('suggestion-save').click();
    await frame.locator('.sg-item').filter({hasText:'Cabinet depth'}).waitFor();
    const done=page.waitForEvent('download');await id('suggestions-export').click();
    const file=await done;const data=JSON.parse(await readFile(await file.path(),'utf8'));
    assert.equal(data.schemaVersion,6);assert.equal(data.suggestions.length,3);
    const edited=data.suggestions.find(n=>n.region.kind==='surface-pins'),draw=data.suggestions.find(n=>n.region.kind==='surface-stroke');
    assert.equal(edited.text,'Cabinet depth 0.60 m.');assert.equal(edited.version,2);
    assert.ok(draw.region.segments.flatMap(s=>s.points).length>=4);
    assert.deepEqual(draw.targetObjectKeys,[...new Set(draw.region.segments.map(s=>s.object.key))]);
    for(const seg of draw.region.segments)for(const point of seg.points){
      assert.ok(seg.object.path.length && Number.isInteger(point.triangle) && point.local.length===3 && point.normalWorld.length===3);
      assert.deepEqual(point.blender,[point.world[0],-point.world[2],point.world[1]]);
    }
    assert.match(draw.region.markedView.dataUrl,/^data:image\/jpeg;base64,/);
    assert.equal(edited.region.points.length,1);assert.ok(edited.region.points[0].object.path.length);
    const object=data.suggestions.find(n=>n.region.kind==='model-object');
    assert.ok(object.region.object.sourceId && object.region.object.layer==='Joinery');
    assert.ok(object.region.members.length && object.region.anchor.object.path.length && object.region.boundsWorld.max.length===3);
    assert.equal(object.targetObjectKeys[0],object.region.object.key);assert.match(object.region.markedView.dataUrl,/^data:image\/jpeg;base64,/);
    for(const n of [edited,draw])assert.equal(n.referenceImages[0].dataUrl.split(',')[1],sample.toString('base64'));
    if(!mobile)await writeFile(path.join(artifacts,'suggestions-v5-example.json'),JSON.stringify(data,null,2)+'\n');
    await id('revision-status').waitFor({state:'hidden',timeout:5500});
    // Exercise the index written by the previous viewer: it has no marker geometry or creation date.
    await frame.evaluate(async note=>{
      const db=await new Promise(r=>{const q=indexedDB.open('layout2house-suggestions-v1');q.onsuccess=()=>r(q.result);});
      const scope='list/private/'+note.model.projectId;
      const summary={id:note.id,updatedAt:note.updatedAt,model:note.model,title:note.text,region:{roomIds:note.region.roomIds,view:{mode:note.region.view.mode}}};
      const iv=crypto.getRandomValues(new Uint8Array(12)),enc=new TextEncoder();
      const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(JSON.stringify([scope,note.id]))},
        window.__HOUSE_SUGGESTION_PRIVACY.key,enc.encode(JSON.stringify(summary)));
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('suggestions','readwrite');
        tx.objectStore('suggestions').put({scope,id:note.id,version:note.version,iv,ciphertext});tx.oncomplete=resolve;tx.onerror=reject;
      });
      db.close();
    },edited);
    await page.reload();frame=await unlock();await frame.evaluate(()=>__walkthrough.revisions.select('0.5'));
    await frame.waitForFunction(()=>__walkthrough.modes.activeRoot.parent.getObjectByName('Suggestion annotations').children.filter(o=>o.isSprite).length===3);
    await list();assert.equal(await frame.locator('.sg-item').count(),3);
    const encrypted=await frame.evaluate(async()=>{
      const db=await new Promise(r=>{const req=indexedDB.open('layout2house-suggestions-v1');req.onsuccess=()=>r(req.result);});
      const rows=await new Promise(r=>{const req=db.transaction('suggestions').objectStore('suggestions').getAll();req.onsuccess=()=>r(req.result);});
      db.close();return rows.every(row=>!row.note && row.ciphertext.byteLength>0 && row.iv.length===12);
    });
    assert.ok(encrypted);
    const listRow=frame.locator('.sg-list li').filter({hasText:'Cabinet depth'});
    page.once('dialog',d=>d.dismiss());await listRow.locator('.sg-delete').click();
    assert.equal(await frame.locator('.sg-count').innerText(),'3');
    page.once('dialog',d=>d.accept());await listRow.locator('.sg-delete').click();
    await frame.waitForFunction(()=>document.querySelector('.sg-count').textContent==='2');
    await frame.locator('.sg-item').filter({hasText:'Change the finish'}).click();
    assert.equal(await frame.locator('.sg-editor details').count(),0);
    page.once('dialog',d=>d.accept());await id('suggestion-delete').click();
    await frame.waitForFunction(()=>document.querySelector('.sg-count').textContent==='1');
    assert.equal((await annotations()).filter(o=>o.type==='Sprite').length,1);
    await page.reload();frame=await unlock();await list();
    assert.equal(await frame.locator('.sg-item').count(),1);
    const exported=page.waitForEvent('download');await id('suggestions-export').click();
    const remaining=JSON.parse(await readFile(await (await exported).path(),'utf8'));
    assert.deepEqual(remaining.suggestions.map(n=>n.id),[object.id]);
    console.log('Passed',width,'px: top toolbar, navigation during pinning, point/surface-draw/whole-object comments, persistent clickable highlights, revision switching, attachments, deletion and export');
    await context.close();
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
