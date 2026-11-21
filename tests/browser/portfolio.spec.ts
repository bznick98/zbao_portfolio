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

test('About interleaves work and writing by date without printing dates in recent updates', async ({ page }) => {
  await page.goto('/#blog');
  const posts = page.locator('.post-card');
  await expect(posts.first()).toBeVisible();
  const latestPosts = await posts.evaluateAll(cards => cards.slice(0, 2).map(card => ({
    title: card.querySelector('h2')!.textContent!,
    date: card.querySelector('time')!.dateTime,
  })));
  const chronological = [...latestPosts, { title: 'I joined Apple', date: '2026-09-29' }]
    .sort((a, b) => b.date.localeCompare(a.date));

  await page.goto('/#about');
  const updates = page.getByRole('region', { name: 'Recent updates' });
  await expect(updates.getByRole('listitem')).toContainText(chronological.map(entry => entry.title));
  await expect(updates).not.toContainText(/\b(?:19|20)\d{2}\b/);
  const experience = page.getByRole('region', { name: 'Experience' });
  await expect(experience.locator('time[datetime="2026-09-29"]')).toHaveText('Sep 29, 2026');
});
