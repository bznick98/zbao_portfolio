import { expect, test } from '@playwright/test';

test('the blog gives each post a full row and keeps its original date on the article', async ({ page }) => {
  await page.goto('/#blog');
  const rows = page.locator('.post-list > li');
  await expect(rows.first()).toBeVisible();
  const bounds = await rows.evaluateAll(items => items.map(item => item.getBoundingClientRect().toJSON()));
  for (let i = 1; i < bounds.length; i++) {
    expect(bounds[i].top).toBeGreaterThanOrEqual(bounds[i - 1].bottom - 1);
    expect(bounds[i].left).toBe(bounds[0].left);
    expect(bounds[i].right).toBe(bounds[0].right);
  }
  const dates = await rows.locator('time').evaluateAll(times => times.map(time => time.getAttribute('datetime')));
  expect(dates).toEqual([...dates].sort().reverse());

  for (const [slug, date, label] of [
    ['bilateral-neural-operators', '2023-04-28', 'Apr 28, 2023'],
    ['focus-stacking', '2020-12-04', 'Dec 4, 2020'],
  ]) {
    const link = page.locator(`.post-card[href="#blog/${slug}"]`);
    await expect(link.locator('time')).toHaveText(label);
    await link.click();
    const time = page.locator('article header time');
    await expect(time).toBeVisible();
    await expect(time).toHaveAttribute('datetime', date);
    await expect(time).toHaveText(label);
    await page.getByRole('link', { name: 'All posts' }).click();
  }
});

test('recent updates links to the latest posts without announcing the Apple role or showing dates', async ({ page }) => {
  await page.goto('/#blog');
  const posts = page.locator('.post-card');
  await expect(posts.first()).toBeVisible();
  const latestTitles = await posts.locator('h2').allTextContents();

  await page.goto('/#about');
  const updates = page.getByRole('region', { name: 'Recent updates' });
  await expect(updates.getByRole('link')).toHaveText(latestTitles.slice(0, 2));
  await expect(updates).not.toContainText(/joined Apple/i);
  await expect(updates).not.toContainText(/\b(?:19|20)\d{2}\b/);
});

test('the Apple experience displays only the current employment status', async ({ page }) => {
  await page.goto('/#about');
  const experience = page.getByRole('region', { name: 'Experience' });
  const apple = experience.getByRole('link', { name: 'Apple', exact: true }).locator('..');
  await expect(apple.locator('span')).toHaveText('Present');
});
