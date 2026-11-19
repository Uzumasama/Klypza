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

  test('dashboard stays hidden on public pages at desktop and mobile widths', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.locator('#dashboardCard')).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('#dashboardCard')).toBeHidden();
  });

  test('plans page matches the agreed Free, Standard and Premium allowances', async ({ page }) => {
    await page.goto('/plans');
    const visiblePlanText = (text) => page.locator('li:visible').getByText(text, { exact: true });
    for (const allowance of [
      '5 videos per batch',
      '10 videos per day',
      '15 videos per batch',
      '60 videos per day',
      '25 videos per batch',
      '100 videos per day',
    ]) {
      await expect(visiblePlanText(allowance)).toBeVisible();
    }
    await expect(page.locator('.plan-price:visible').filter({ hasText: '$1.00' })).toBeVisible();
    await expect(page.locator('.plan-price:visible').filter({ hasText: '$2.00' })).toBeVisible();
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


  test('public plan API reports the configured limits and sandbox prices', async ({ request }) => {
    const response = await request.get('/api/plans');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.testPricing).toBe(true);
    expect(data.plans).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'free', dailyLimit: 10, batchLimit: 5, ads: true }),
      expect.objectContaining({ id: 'standard', dailyLimit: 60, batchLimit: 15, ads: false, price: 1 }),
      expect.objectContaining({ id: 'premium', dailyLimit: 100, batchLimit: 25, ads: false, price: 2 }),
    ]));
  });

  test('registration rejects invalid name, email, and password without creating accounts', async ({ request }) => {
    const validEmail = 'klypza-e2e-invalid@example.invalid';
    const longPassword = 'ThisIsAnInvalidTestPassword123!';

    const missingName = await request.post('/api/auth/register', {
      data: { name: '', email: validEmail, password: longPassword },
    });
    expect(missingName.status()).toBe(400);
    expect((await missingName.json()).message).toMatch(/name/i);

    const invalidEmail = await request.post('/api/auth/register', {
      data: { name: 'E2E Validation', email: 'not-an-email', password: longPassword },
    });
    expect(invalidEmail.status()).toBe(400);
    expect((await invalidEmail.json()).message).toMatch(/email/i);

    const shortPassword = await request.post('/api/auth/register', {
      data: { name: 'E2E Validation', email: validEmail, password: 'short' },
    });
    expect(shortPassword.status()).toBe(400);
    expect((await shortPassword.json()).message).toMatch(/password/i);
  });

  test('authentication and account endpoints protect private data and mutations', async ({ request }) => {
    const session = await request.get('/api/auth/me');
    expect(session.status()).toBe(401);
    expect(await session.json()).toMatchObject({ authenticated: false });

    const profile = await request.post('/api/account/profile', {
      data: { name: 'Unauthorized Test' },
    });
    expect(profile.status()).toBe(401);

    const password = await request.post('/api/account/password', {
      data: { currentPassword: 'invalid', newPassword: 'NotARealPassword123!' },
    });
    expect(password.status()).toBe(401);

    const checkout = await request.post('/api/billing/checkout', {
      data: { plan: 'standard' },
    });
    expect([401, 503]).toContain(checkout.status());
    if (checkout.status() === 503) {
      expect((await checkout.json()).error).toBe('billing_not_configured');
    }

    const portal = await request.post('/api/billing/portal');
    expect([401, 503]).toContain(portal.status());
    if (portal.status() === 503) {
      expect((await portal.json()).error).toBe('billing_not_configured');
    }
  });

  test('login rejects unknown test account without creating a session', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: 'klypza-e2e-no-account@example.invalid', password: 'InvalidTestPassword123!' },
    });
    expect([400, 401]).toContain(response.status());
    const session = await request.get('/api/auth/me');
    expect(session.status()).toBe(401);
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
