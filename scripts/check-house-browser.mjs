import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
let password = '';
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, '');
if (!password) throw new Error('Provide the review password on stdin.');
const origin = process.argv[2] || 'http://127.0.0.1:3038';
const artifacts = path.resolve('artifacts/house');
await mkdir(artifacts, { recursive: true });
const browser = await playwright.chromium.launch(process.platform === 'win32' ? { channel: 'msedge', headless: true } : { headless: true });
const errors = [];
const checks = [];

async function login(page) {
  await page.getByLabel('Password / 访问密码').fill(password);
  await page.getByRole('button', { name: 'Enter the house' }).click();
  await page.locator('iframe').waitFor({ timeout: 120000 });
  const element = await page.locator('iframe').elementHandle();
  const frame = await element.contentFrame();
  await frame.waitForFunction(() => window.__walkthrough?.ready, null, { timeout: 120000 });
  return frame;
}
async function fullscreen(page, frame) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight }));
  assert.equal(dimensions.overflow, false);
  const box = await page.locator('iframe').boundingBox();
  assert.deepEqual(box, { x: 0, y: 0, width: dimensions.width, height: dimensions.height });
  assert.equal(await frame.locator('#stage canvas').evaluate(canvas => canvas.clientWidth === innerWidth && canvas.clientHeight === innerHeight), true);
  assert.equal(await page.getByRole('button', { name: 'Open menu' }).count(), 0);
  assert.equal(await page.getByRole('button', { name: /Eye:/ }).count(), 0);
}
async function minimal(frame) {
  assert.equal(await frame.locator('#settings').isVisible(), false);
  assert.equal(await frame.locator('.map').isVisible(), false);
  assert.equal((await frame.locator('body').innerText()).trim(), '···');
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  const downloads = [];
  page.on('request', req => { if (req.url().endsWith('.bin')) downloads.push(req.url()); });
  await page.goto(`${origin}/#house`);
  await page.getByLabel('Password / 访问密码').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(downloads.length, 0);
  assert.equal(await page.locator('h1, h2, header, footer').count(), 0);
  await page.screenshot({ path: path.join(artifacts, 'desktop-locked-dark.png') });
  await page.getByLabel('Password / 访问密码').fill('wrong-password');
  await page.getByRole('button', { name: 'Enter the house' }).click();
  await page.getByRole('alert').filter({ hasText: 'That password' }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  assert.ok(downloads.every(url => !url.endsWith('model.bin')));
  let frame = await login(page);
  await fullscreen(page, frame);
  await minimal(frame);
  await page.screenshot({ path: path.join(artifacts, 'desktop-fullscreen-dark.png') });
  const before = await frame.evaluate(() => __walkthrough.getState().position);
  await frame.locator('#stage canvas').click({ position: { x: 400, y: 280 } });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(450); await page.keyboard.up('ArrowRight');
  const after = await frame.evaluate(() => __walkthrough.getState().position);
  assert.ok(Math.hypot(...after.map((n, i) => n - before[i])) > .01);
  await frame.click('#menu-toggle');
  assert.equal(await frame.locator('#settings').isVisible(), true);
  const ids = await frame.locator('#rooms option').evaluateAll(options => options.map(o => o.value));
  assert.equal(ids.length, 11);
  for (const id of ids) {
    await frame.selectOption('#rooms', id);
    const collision = await frame.evaluate(() => __walkthrough.collision());
    assert.ok(collision === null || collision.depth <= .01);
  }
  await frame.selectOption('#rooms', 'living_wide');
  await frame.selectOption('#quality', 'low');
  assert.equal(await frame.evaluate(() => __walkthrough.getState().ambientOcclusion), false);
  await frame.check('#map-toggle'); assert.equal(await frame.locator('.map').isVisible(), true);
  await frame.uncheck('#map-toggle');
  await page.keyboard.press('Escape');
  await minimal(frame);
  await frame.click('#menu-toggle'); await frame.click('#lock-page');
  await page.getByLabel('Password / 访问密码').waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  await login(page); await page.reload();
  await page.getByLabel('Password / 访问密码').waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  checks.push('Password rejection, no early model download, fullscreen canvas, one visible menu button, 11 viewpoints, keyboard movement, hidden minimap, quality, Escape, locking and reload');

  // Theme controls stay on the portfolio; House inherits the selected theme.
  await page.evaluate(() => { location.hash = 'profile'; });
  await page.getByRole('heading', { name: 'Profile', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.locator('.theme-transition-flash').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'House', exact: true }).click();
  await page.getByLabel('Password / 访问密码').waitFor();
  await page.screenshot({ path: path.join(artifacts, 'desktop-locked-light.png') });
  await page.getByLabel('Password / 访问密码').fill(password);
  await page.getByLabel('Password / 访问密码').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Enter the house');
  frame = await login(page);
  assert.equal(await frame.evaluate(() => document.documentElement.dataset.theme), 'light');
  await fullscreen(page, frame); await minimal(frame);
  await page.screenshot({ path: path.join(artifacts, 'desktop-fullscreen-light.png') });
  await page.goBack();
  await page.getByRole('heading', { name: 'Profile', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
  checks.push('Portfolio navigation/theme restored on exit; minimal login and fullscreen viewer inherit light theme; keyboard entry');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(`${origin}/#house`);
  await mobile.getByLabel('Password / 访问密码').waitFor();
  await mobile.screenshot({ path: path.join(artifacts, 'mobile-locked-dark.png') });
  frame = await login(mobile);
  await fullscreen(mobile, frame); await minimal(frame);
  const cdp = await mobile.context().newCDPSession(mobile);
  const lookBefore = await frame.evaluate(() => __walkthrough.getState().yaw);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 400 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y: 420 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(Math.abs(lookBefore - await frame.evaluate(() => __walkthrough.getState().yaw)) > .05);
  const pad = await frame.locator('#joystick').boundingBox();
  const moveBefore = await frame.evaluate(() => __walkthrough.getState().position);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 + 25 }] });
  await mobile.waitForTimeout(500);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const moveAfter = await frame.evaluate(() => __walkthrough.getState().position);
  assert.ok(Math.hypot(...moveAfter.map((n, i) => n - moveBefore[i])) > .01);
  await mobile.screenshot({ path: path.join(artifacts, 'mobile-fullscreen-dark.png') });
  await mobile.setViewportSize({ width: 844, height: 390 });
  await frame.waitForFunction(() => __walkthrough.getState().aspect > 2);
  await fullscreen(mobile, frame);
  await frame.click('#menu-toggle');
  await frame.click('#lock-page');
  await mobile.getByLabel('Password / 访问密码').waitFor();
  checks.push('Mobile fullscreen portrait/landscape, touch look, joystick, reduced motion, collapsed controls and locking');
  await mobile.close();
  const direct = await browser.newPage();
  await direct.goto(`${origin}/house-viewer/index.html`);
  await direct.getByRole('link', { name: 'Open House' }).waitFor();
  assert.equal(await direct.evaluate(() => Boolean(window.__walkthrough)), false);
  await direct.close();
  assert.deepEqual(errors, []);
  await writeFile(path.join(artifacts, 'browser-check.json'), JSON.stringify({ passed: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, artifacts }));
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(artifacts, 'failure.png') }).catch(() => {});
    console.log(JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText()).slice(0, 1500), errors }));
  }
  throw error;
} finally { await browser.close(); }
