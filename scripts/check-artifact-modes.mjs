import assert from 'node:assert/strict';
import path from 'node:path';

export async function checkArtifactModes({ page, frame = page, artifacts, mobile = false }) {
  const state = () => frame.evaluate(() => __walkthrough.modes.getState());
  const settle = () => frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const samePose = (a, b) => assert.deepEqual(a, b, 'walk position/orientation/room/zoom must be restored exactly');
  assert.equal((await state()).mode, 'walk');
  assert.equal(await frame.locator('#mode-walk').getAttribute('aria-pressed'), 'true');
  await frame.evaluate(() => __walkthrough.go('living_wide'));
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
  await frame.click('#artifact-shortcut'); await settle();
  let model = await state();
  assert.equal(model.mode, 'model'); samePose(model.walkPose,pose);
  assert.deepEqual(model.marker.position,pose.position); assert.equal(model.marker.yaw,pose.yaw);
  assert.equal(model.modelView.boundsInView,true); assert.equal(model.walkRootVisible,false);
  assert.deepEqual(Object.keys(model.shell.layers).sort(),['Doors','Floors','Structure','Walls','Windows']);
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
  await frame.click('#artifact-shortcut'); samePose((await state()).walkPose,pose);
  assert.equal((await state()).walkAppearance,before.walkAppearance); assert.equal((await state()).walkRootVisible,true);
  await page.screenshot({path:path.join(artifacts,`${mobile?'mobile':'desktop'}-walk-restored.png`)});
  await frame.evaluate(()=>__walkthrough.go('master_wide'));
  const master=(await state()).walkPose; assert.notDeepEqual(master.position,pose.position);
  await frame.click('#mode-model'); await settle(); assert.deepEqual((await state()).marker.position,master.position);
  await frame.click('#mode-walk'); samePose((await state()).walkPose,master);
  // Warm both render paths before checking that repeated switches do not grow GPU resources.
  await settle(); const resources=(await state()).resources;
  for(let i=0;i<6;i++) { await frame.click(i%2?'#mode-model':'#artifact-shortcut'); await settle(); await frame.click(i%2?'#mode-walk':'#artifact-shortcut'); await settle(); }
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
  return {defaultMode:'walk',exactPoseRoundTrip:true,markerFromWalkPose:true,emptyShell:true,orbit:true,pan:true,zoom:true,independentWalkCamera:true,repeatSwitches:6,stableGpuResources:true,pointerLockExit:!mobile,touch:mobile,resize:mobile};
}
