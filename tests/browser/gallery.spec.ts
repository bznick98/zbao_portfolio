import { readFileSync } from 'node:fs';
import { expect, test, type Locator } from '@playwright/test';

const snapshot: { src: string; width: number; height: number; alt: string; description: string; published: string }[] =
  JSON.parse(readFileSync(new URL('../../data/unsplash-snapshot.json', import.meta.url), 'utf8'));

// The offline suite uses the documented sizes of the pinned Unsplash images. The build
// embeds these same records in dev, so browser tests need neither API credentials nor CDN access.
test.beforeEach(async ({ page }) => {
  await page.route('https://images.unsplash.com/**', async route => {
    const photo = snapshot.find(p => p.src === route.request().url());
    if (!photo) throw new Error('Unexpected image outside the snapshot');
    await route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${photo.width}" height="${photo.height}"/>` });
  });
});

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
  await page.route('https://images.unsplash.com/**', async route => { await slowImages; await route.fallback(); });
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
  const rows = await page.locator('.photo-sequence').evaluate(container => {
    const edge = container.getBoundingClientRect();
    const groups = new Map<number, DOMRect[]>();
    for (const img of container.querySelectorAll('img')) {
      const rect = img.getBoundingClientRect();
      const row = Math.round(rect.top);
      groups.set(row, [...(groups.get(row) ?? []), rect]);
    }
    return [...groups.values()].map(row => [row[0].left - edge.left, row.at(-1)!.right - edge.right,
      Math.max(...row.map(r => r.height)) - Math.min(...row.map(r => r.height))]);
  });
  for (const row of rows) for (const difference of row) expect(Math.abs(difference)).toBeLessThan(1);
  const captions = page.locator('.gallery-print figcaption');
  for (const [i, photo] of snapshot.entries()) await expect(captions.nth(i)).toHaveText(photo.description + ', ' + photo.published.slice(0, 4));
  await expect(page.locator('.gallery-more a')).toHaveAttribute('href', 'https://unsplash.com/@zbao');
  await expect(page.locator('footer a[aria-label="Unsplash"]')).toHaveAttribute('href', 'https://unsplash.com/@zbao');
  await expect(page.locator('.gallery-wordmark span')).toHaveText(['zongnan', 'BAo']);
});

test('an interrupted enlargement returns to the selected print, including after resize', async ({ page }) => {
  await page.goto('/');
  const source = page.getByRole('button', { name: 'Enlarge ' + snapshot[2].alt });
  await source.focus();
  await page.keyboard.press('Enter');
  const viewer = page.getByRole('dialog', { name: snapshot[2].alt });
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
  await page.getByRole('button', { name: 'Enlarge ' + snapshot[1].alt }).click();
  const viewer = page.getByRole('dialog', { name: snapshot[1].alt });
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
