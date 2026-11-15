import { test, expect } from '@playwright/test';

test.describe('Klypza public website', () => {
  test('homepage loads with a useful title and main content', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'homepage should return an HTTP response').not.toBeNull();
    expect(response.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/Klypza/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/internal server error|worker threw exception/i);
  });

  test('homepage exposes navigation and legal information links', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a[href]');
    await expect(links.first()).toBeAttached();
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')).filter(Boolean));
    expect(hrefs.length).toBeGreaterThan(3);
    expect(hrefs.some(href => /privacy/i.test(href))).toBeTruthy();
    expect(hrefs.some(href => /terms/i.test(href))).toBeTruthy();
  });

  test('main layout fits the viewport without horizontal page overflow', async ({ page }) => {
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
  });

  test('public homepage directs visitors to registration instead of exposing the dashboard downloader', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/register"]').filter({ hasText: /get started free/i })).toBeVisible();
    const downloader = page.locator('#profileUrl');
    await expect(downloader).toBeAttached();
    await expect(downloader).toBeHidden();
  });

  test('important public pages return successfully', async ({ request }) => {
    for (const path of ['/about', '/contact', '/privacy-policy', '/terms', '/copyright']) {
      const response = await request.get(path);
      expect(response.status(), path + ' should load').toBeLessThan(400);
    }
  });
});

test.describe('Klypza API smoke and access-control checks', () => {
  test('health endpoint responds without exposing secrets', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.provider).toBe('saveapi');
    expect(typeof data.configured).toBe('boolean');
    expect(JSON.stringify(data)).not.toMatch(/api[_-]?key|token|secret/i);
  });

  test('account and batch endpoints reject unauthenticated visitors', async ({ request }) => {
    const account = await request.get('/api/account');
    expect(account.status()).toBe(401);
    const batch = await request.post('/api/batch/start', {
      data: { batchSize: 5 },
    });
    expect(batch.status()).toBe(401);
  });

  test('download endpoint requires an authenticated account before processing URLs', async ({ request }) => {
    const response = await request.get('/api/download', {
      params: { url: 'https://www.youtube.com/shorts/abcdefghijk' },
    });
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('login_required');
  });
});
