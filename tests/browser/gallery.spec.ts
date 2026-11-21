import { expect, test, type Locator } from '@playwright/test';

async function expectNativeFrame(images: Locator) {
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    const difference = await img.evaluate(async (el: HTMLImageElement) => {
      await el.decode();
      const box = el.getBoundingClientRect();
      return Math.abs(box.height - box.width * el.naturalHeight / el.naturalWidth);
    });
    expect(difference).toBeLessThan(1);
  }
}

test('each print reserves its original proportions and keeps its source across refreshes', async ({ page }) => {
  let release!: () => void;
  const slowImages = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/gallery/*.webp', async route => { await slowImages; await route.continue(); });
  const replacements: string[] = [];
  page.on('request', request => {
    const { hostname, pathname } = new URL(request.url());
    if (hostname === 'api.unsplash.com' || pathname === '/api/generate-captions') replacements.push(pathname);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const prints = page.locator('.photo-tile img');
  await expect(prints.first()).toBeVisible();
  const dimensions = () => prints.evaluateAll((images: HTMLImageElement[]) => images.map(img => {
    const { width, height } = img.getBoundingClientRect();
    return { src: img.getAttribute('src'), width, height };
  }));
  const reserved = await dimensions();
  expect(reserved.length).toBeGreaterThan(2);
  expect(new Set(reserved.map(p => Math.round(p.width))).size).toBeGreaterThan(1);
  release();
  await expectNativeFrame(prints);
  expect(await dimensions()).toEqual(reserved);
  for (let i = 0; i < 2; i++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(prints.first()).toBeVisible();
    expect(await dimensions()).toEqual(reserved);
  }
  expect(replacements).toEqual([]);
});

test('an interrupted enlargement returns to the selected print, including after resize', async ({ page }) => {
  await page.goto('/');
  const source = page.getByRole('button', { name: 'Enlarge Alpenglow' });
  await source.focus();
  await page.keyboard.press('Enter');
  const viewer = page.getByRole('dialog', { name: 'Alpenglow' });
  await expect(viewer).toBeVisible();
  const image = viewer.locator('img');
  await image.evaluate(el => {
    const motion = el.getAnimations()[0];
    if (!motion) throw new Error('Expected a thumbnail-to-viewer animation');
    motion.pause();
    motion.currentTime = 125;
  });
  await expectNativeFrame(image);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(source).toBeFocused();

  await source.click();
  await image.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  await page.setViewportSize({ width: 790, height: 530 });
  await expectNativeFrame(image);
  await viewer.getByRole('button', { name: 'Close photograph' }).click();
  await expect(viewer).toHaveCount(0);
  await expect(source).toBeFocused();
});

test('reduced motion, menu navigation and preview images keep working', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enlarge Afternoon at the Getty' }).click();
  const viewer = page.getByRole('dialog', { name: 'Afternoon at the Getty' });
  expect(await viewer.locator('img').evaluate(img => img.getAnimations().length)).toBe(0);
  await viewer.getByRole('button', { name: 'Close photograph' }).click();
  await expect(viewer).toHaveCount(0);
  for (const [name, images] of [['About', '.updates-section img'], ['Blog', '.post-card img']]) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog', { name: 'Portfolio menu' }).getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expectNativeFrame(page.locator(images));
  }
});

test('navigating through the menu keeps the gallery on screen until the next page is ready', async ({ page }) => {
  let release!: () => void;
  const slowRoute = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/pages/Blog.tsx*', async route => { await slowRoute; await route.continue(); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Portfolio menu' });
  await menu.getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(page).toHaveURL(/#blog$/);
  await expect(page.locator('.photo-sequence')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: 'Blog', exact: true })).toBeVisible();
});
