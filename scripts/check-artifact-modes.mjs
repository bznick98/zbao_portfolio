import assert from 'node:assert/strict';
import path from 'node:path';

async function checkMeasurementTools({page,frame,artifacts,mobile,expectedPlan}) {
  const state=()=>frame.evaluate(()=>__walkthrough.tools.getState());
  const pose=()=>frame.evaluate(()=>__walkthrough.modes.getState().walkPose);
  const click=async p=>mobile?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const settle=()=>page.waitForTimeout(100);
  await frame.evaluate(()=>__walkthrough.go(document.querySelector('#rooms').options[0].value));
  const savedPose=await pose();
  assert.equal((await state()).dimensions,false);
  await frame.click('#dimensions-toggle');
  assert.equal((await state()).wallDimensionsVisible,true);
  assert.equal(await frame.locator('#dimensions-toggle').getAttribute('aria-pressed'),'true');
  const dimensions=(await state()).planDimensions;
  if(expectedPlan!==undefined)assert.deepEqual(dimensions,expectedPlan?.dimensions||[]);
  for(const d of dimensions) assert.ok(Math.abs(Math.hypot(...d.a.map((v,i)=>v-d.b[i]))*1000-d.valueMm)<=6);
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-wall-dimensions.png`)});
  await frame.click('#mode-model'); await settle();
  assert.equal((await state()).wallDimensionsVisible,!dimensions.length);assert.equal((await state()).planDimensionsVisible,Boolean(dimensions.length));
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-plan-dimensions.png`)});
  await frame.click('#measure-toggle');
  assert.equal((await state()).ruler.enabled,true);
  const viewport=page.viewportSize();
  if(mobile) {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:130,y:380},{id:1,x:250,y:380}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:110,y:400},{id:1,x:270,y:400}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {
    await page.mouse.move(viewport.width*.5,viewport.height*.5);await page.mouse.down();
    await page.mouse.move(viewport.width*.6,viewport.height*.55,{steps:8});await page.mouse.up();
  }
  assert.deepEqual((await state()).ruler.points,[],'drag/pinch must not place ruler endpoints');
  await frame.click('#model-reset');await settle();
  async function findPoints(floorOnly=false) {
    return frame.evaluate(floorOnly=>{
      const found=[];
      for(let y=innerHeight*.38;y<innerHeight*.80;y+=innerHeight*.045) for(let x=innerWidth*.18;x<innerWidth*.83;x+=innerWidth*.045) {
        const hit=__walkthrough.tools.pickAt(x,y);
        if(hit&&(!floorOnly||hit.layer==='Floors')) found.push({x,y,...hit});
      }
      const a=found[Math.floor(found.length*.4)]||found[0];
      const b=found.find(p=>a&&Math.hypot(...p.point.map((v,i)=>v-a.point[i]))>1.5);
      return [a,b];
    },floorOnly);
  }
  const [a,b]=await findPoints(true);assert.ok(a&&b,'find two visible floor points');
  await click(a);await click(b);await settle();
  let measured=(await state()).ruler;
  assert.equal(measured.points.length,2);
  for(const [i,expected] of [a.point,b.point].entries()) assert.ok(Math.hypot(...measured.points[i].map((v,k)=>v-expected[k]))<.001);
  const expectedDistance=Math.hypot(...a.point.map((v,i)=>v-b.point[i]));
  assert.ok(Math.abs(measured.distanceMeters-expectedDistance)<.001);
  assert.ok(measured.line.every((v,i)=>Math.abs(v-measured.points.flat()[i])<.001));
  await frame.click('#language-toggle');assert.match(await frame.locator('#measure-hint').textContent(),/三维距离/);
  assert.deepEqual((await state()).ruler.points,measured.points);await frame.click('#language-toggle');
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-ruler.png`)});
  if(!mobile) {
    await page.mouse.move(viewport.width*.5,viewport.height*.55);await page.mouse.down();await page.mouse.move(viewport.width*.55,viewport.height*.58,{steps:6});await page.mouse.up();
    assert.deepEqual((await state()).ruler.points,measured.points);
    assert.notDeepEqual((await state()).ruler.projected,measured.projected);
  }
  await frame.click('#measure-clear');assert.deepEqual((await state()).ruler.points,[]);
  await frame.click('#mode-walk');await settle();assert.deepEqual(await pose(),savedPose);
  const [c,d]=await findPoints();assert.ok(c&&d,'ruler also picks walkthrough surfaces');
  await click(c);await click(d);
  measured=(await state()).ruler;assert.equal(measured.points.length,2);
  assert.ok(Math.abs(measured.distanceMeters-Math.hypot(...c.point.map((v,i)=>v-d.point[i])))<.001);
  await frame.click('#measure-toggle');assert.equal((await state()).ruler.enabled,false);assert.equal(await frame.locator('#measure-panel').isVisible(),false);
  assert.equal((await state()).wallDimensionsVisible,true);
  await frame.click('#dimensions-toggle');assert.equal((await state()).dimensionsVisible,false);
  await frame.evaluate(()=>__walkthrough.go(document.querySelector('#rooms').options[0].value));
  return {planAnnotations:dimensions.length,pdfSpanToleranceMm:6,twoPoint3dDistance:true,walkAndModel:true,languagePreservesMeasurement:true,dragDoesNotMeasure:true,touch:mobile};
}

export async function checkArtifactModes({ page, frame = page, artifacts, mobile = false, expectedPlan }) {
  const state = () => frame.evaluate(() => __walkthrough.modes.getState());
  const settle = () => frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const samePose = (a, b) => assert.deepEqual(a, b, 'walk position/orientation/room/zoom must be restored exactly');
  assert.equal((await state()).mode, 'walk');
  assert.equal(await frame.locator('#mode-walk').getAttribute('aria-pressed'), 'true');
  await frame.evaluate(() => __walkthrough.go(document.querySelector('#rooms').options[0].value));
  assert.equal(await frame.locator('#artifact-shortcut').count(), 0);
  assert.equal(await frame.locator('html').getAttribute('lang'), 'en');
  assert.equal(await frame.locator('#mode-walk').textContent(), 'Walkthrough');
  assert.equal(await frame.locator('#mode-model').textContent(), 'Model');
  const languagePose=(await state()).walkPose;
  await frame.click('#language-toggle');
  assert.equal(await frame.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await frame.locator('#mode-model').textContent(), '建筑模型');
  samePose((await state()).walkPose,languagePose);
  await frame.click('#menu-toggle');
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-settings-cn.png`)});
  await frame.click('#menu-toggle'); await frame.click('#language-toggle');
  async function checkHeader() {
    const boxes=await Promise.all(['#language-toggle','#dimensions-toggle','#measure-toggle','#map-button','.artifact-modes','#menu-toggle'].map(id=>frame.locator(id).boundingBox()));
    const viewport=page.viewportSize();
    for (const box of boxes) assert.ok(box && box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width && box.height>=38);
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
      const a=boxes[i],b=boxes[j];
      assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y,'header tools overlap');
    }
  }
  await checkHeader();
  const menuShape=await frame.locator('#menu-toggle').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius}));
  assert.equal(menuShape.width,menuShape.height);assert.equal(menuShape.radius,'50%');
  assert.equal(await frame.locator('#map-panel').isVisible(),true);
  await frame.click('#map-button');assert.equal(await frame.locator('#map-panel').isVisible(),false);
  assert.equal(await frame.locator('#map-toggle').isChecked(),false);assert.equal(await frame.locator('#map-button').getAttribute('aria-pressed'),'false');
  await frame.click('#mode-model');await frame.click('#mode-walk');assert.equal(await frame.locator('#map-panel').isVisible(),false,'mode round-trip preserves minimap preference');
  await frame.click('#menu-toggle');await frame.locator('#map-toggle').check();await frame.click('#menu-toggle');
  assert.equal(await frame.locator('#map-panel').isVisible(),true);assert.equal(await frame.locator('#map-button').getAttribute('aria-pressed'),'true');
  if (mobile) { await page.setViewportSize({width:320,height:844}); await settle(); await checkHeader(); await page.setViewportSize({width:390,height:844}); await settle(); }

  let cdp;
  if (mobile) {
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x:170,y:370}] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x:220,y:390}] });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  } else {
    await frame.locator('#stage canvas').click({ position:{x:700,y:430} });
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
    await frame.waitForFunction(() => __walkthrough.getState().speed < .003);
    await page.mouse.move(700,430); await page.mouse.down(); await page.mouse.move(760,450,{steps:8}); await page.mouse.up();
  }
  const before = await state(), pose = before.walkPose;
  await frame.click('#mode-model'); await settle();
  let model = await state();
  assert.equal(model.mode, 'model'); samePose(model.walkPose,pose);
  assert.deepEqual(model.marker.position,pose.position); assert.equal(model.marker.yaw,pose.yaw);
  assert.equal(model.modelView.boundsInView,true); assert.equal(model.walkRootVisible,false);
  assert.ok(Object.keys(model.shell.layers).every(x=>['Doors','Floors','Structure','Walls','Windows'].includes(x)));assert.ok(model.shell.layers.Walls&&model.shell.layers.Floors);
  assert.equal(await frame.locator('#joystick').isVisible(),false);
  assert.equal(await frame.locator('.map').isVisible(),false);
  const originalView = model.modelView, markerProjection = model.marker.projected;
  if (mobile) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:380}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:230,y:415}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.notDeepEqual((await state()).modelView.quaternion,originalView.quaternion);
    const beforePinch=(await state()).modelView;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:130,y:380},{id:1,x:250,y:380}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:90,y:420},{id:1,x:290,y:420}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const afterPinch=(await state()).modelView;
    assert.notDeepEqual(afterPinch.position,beforePinch.position); assert.notDeepEqual(afterPinch.target,beforePinch.target);
  } else {
    await page.mouse.move(700,450); await page.mouse.down(); await page.mouse.move(800,490,{steps:10}); await page.mouse.up();
    assert.notDeepEqual((await state()).modelView.quaternion,originalView.quaternion);
    const beforeZoom=(await state()).modelView.position;
    await page.mouse.wheel(0,-250); await settle(); assert.notDeepEqual((await state()).modelView.position,beforeZoom);
    const beforePan=(await state()).modelView.target;
    await page.mouse.move(700,450); await page.mouse.down({button:'right'}); await page.mouse.move(780,460,{steps:10}); await page.mouse.up({button:'right'});
    assert.notDeepEqual((await state()).modelView.target,beforePan);
    await page.keyboard.down('KeyW'); await page.waitForTimeout(180); await page.keyboard.up('KeyW');
  }
  model=await state(); samePose(model.walkPose,pose); assert.deepEqual(model.marker.position,pose.position);
  const modelBeforeLanguage=(await state()).modelView;
  await frame.click('#language-toggle');
  assert.deepEqual((await state()).modelView,modelBeforeLanguage,'language changes must not reset model controls');
  assert.equal(await frame.locator('#model-reset').textContent(), '恢复斜俯瞰');
  await frame.click('#language-toggle');
  assert.equal(await frame.locator('#model-reset').textContent(), 'Reset overview');

  assert.notDeepEqual(model.marker.projected,markerProjection);
  assert.ok(model.modelView.position[1]>0,'orbit camera stays above the slab');
  await frame.click('#model-reset'); await settle(); assert.equal((await state()).modelView.boundsInView,true);
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-model.png`)});
  if (mobile) {
    await page.setViewportSize({width:844,height:390}); await settle();
    assert.equal((await state()).modelView.boundsInView,true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(artifacts,'mobile-model-landscape.png')});
    await page.setViewportSize({width:390,height:844}); await settle();
  }
  await frame.click('#mode-walk'); samePose((await state()).walkPose,pose);
  assert.equal((await state()).walkAppearance,before.walkAppearance); assert.equal((await state()).walkRootVisible,true);
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-walk-restored.png`)});
  await frame.evaluate(()=>{const options=document.querySelector('#rooms').options;__walkthrough.go(options[Math.min(1,options.length-1)].value);});
  const master=(await state()).walkPose; assert.ok(master.position.every(Number.isFinite));
  await frame.click('#mode-model'); await settle(); assert.deepEqual((await state()).marker.position,master.position);
  await frame.click('#mode-walk'); samePose((await state()).walkPose,master);
  // Warm both render paths before checking that repeated switches do not grow GPU resources.
  await settle(); const resources=(await state()).resources;
  for(let i=0;i<6;i++) { await frame.click('#mode-model'); await settle(); await frame.click('#mode-walk'); await settle(); }
  samePose((await state()).walkPose,master); assert.deepEqual((await state()).resources,resources);
  assert.equal((await state()).walkAppearance,before.walkAppearance);
  assert.equal(await frame.locator('#mode-walk').getAttribute('aria-pressed'),'true');
  if (!mobile) {
    await frame.click('#menu-toggle'); await frame.click('#lock');
    await frame.waitForFunction(() => document.pointerLockElement !== null);
    const lockedPose=(await state()).walkPose;
    await frame.evaluate(() => __walkthrough.modes.setMode('model'));
    await frame.waitForFunction(() => document.pointerLockElement === null);
    await frame.click('#mode-walk'); samePose((await state()).walkPose,lockedPose);
  }
  const measurementTools = await checkMeasurementTools({page,frame,artifacts,mobile,expectedPlan});
  return {measurementTools,defaultMode:'walk',defaultLanguage:'en',languageToggle:true,compactHeader:true,circularMenu:true,minimapQuickToggle:true,minimapModePersistence:true,exactPoseRoundTrip:true,markerFromWalkPose:true,emptyShell:true,orbit:true,pan:true,zoom:true,independentWalkCamera:true,repeatSwitches:6,stableGpuResources:true,pointerLockExit:!mobile,touch:mobile,resize:mobile};
}
