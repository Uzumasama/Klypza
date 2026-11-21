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

  test('anonymous homepage includes the approved Monetag In-Page Push tag without banner placeholders', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);

    const headScripts = await page.locator('head script').evaluateAll(nodes =>
      nodes.map(node => node.textContent || '').join('\\n')
    );
    expect(headScripts).toContain('12312106');
    expect(headScripts).toContain('https://nap5k.com/tag.min.js');

    await expect(page.locator('body')).not.toContainText('Ad placement for Free accounts');
    await expect(page.locator('body')).not.toContainText('Support Klypza — ad placement');
  });

  test('robots.txt and sitemap.xml expose the intended public pages', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain('User-agent: *');
    expect(robotsText).toContain('Sitemap: https://klypza.web.id/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    for (const path of ['/', '/plans', '/about', '/contact', '/privacy-policy', '/terms', '/copyright']) {
      expect(sitemapText).toContain('https://klypza.web.id' + path);
    }
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

  test('plans page shows the 7-day trial, Weekly, Standard and Premium allowances', async ({ page }) => {
    await page.goto('/plans');
    const cards = page.locator('#plansCard .pricing-card:visible');
    const trial = cards.filter({ hasText: 'Free Trial' });
    const weekly = cards.filter({ has: page.locator('h3', { hasText: /^Weekly$/ }) });
    const standard = cards.filter({ hasText: 'Standard' });
    const premium = cards.filter({ hasText: 'Premium' });
    await expect(trial).toContainText('5 videos per batch');
    await expect(trial).toContainText('10 videos per day');
    await expect(weekly).toContainText('$1');
    await expect(weekly).toContainText('5 videos per batch');
    await expect(weekly).toContainText('10 videos per day');
    await expect(standard).toContainText('$5.99');
    await expect(standard).toContainText('15 videos per batch');
    await expect(standard).toContainText('60 videos per day');
    await expect(premium).toContainText('$9.99');
    await expect(premium).toContainText('25 videos per batch');
    await expect(premium).toContainText('100 videos per day');
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
  });


  test('public plan API reports the approved Sandbox prices and allowances', async ({ request }) => {
    const response = await request.get('/api/plans');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.testPricing).toBe(true);
    expect(data.plans).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'trial', dailyLimit: 10, batchLimit: 5, ads: false, price: 0 }),
      expect.objectContaining({ id: 'weekly', dailyLimit: 10, batchLimit: 5, ads: false, price: 1, billingPeriod: 'week' }),
      expect.objectContaining({ id: 'standard', dailyLimit: 60, batchLimit: 15, ads: false, price: 5.99 }),
      expect.objectContaining({ id: 'premium', dailyLimit: 100, batchLimit: 25, ads: false, price: 9.99 }),
    ]));
  });

  test('Sandbox Paddle availability is gated by complete test configuration', async ({ request, page }) => {
    const config = await request.get('/api/billing/config');
    const plansResponse = await request.get('/api/plans');
    expect(plansResponse.status()).toBe(200);
    const data = await plansResponse.json();
    expect(data.testPricing).toBe(true);
    const standard = data.plans.find(plan => plan.id === 'standard');
    const premium = data.plans.find(plan => plan.id === 'premium');
    expect(standard.price).toBe(5.99);
    expect(premium.price).toBe(9.99);
    expect(typeof standard.available).toBe('boolean');
    expect(typeof premium.available).toBe('boolean');
    await page.goto('/plans');
    const standardButton = page.locator('[data-paddle-plan="standard"]').first();
    const premiumButton = page.locator('[data-paddle-plan="premium"]').first();
    if (config.status() === 503) {
      expect(standard.available).toBe(false);
      expect(premium.available).toBe(false);
      await expect(standardButton).toBeDisabled();
      await expect(premiumButton).toBeDisabled();
    } else {
      expect(config.status()).toBe(200);
      const billing = await config.json();
      expect(billing.environment).toBe('sandbox');
      expect(billing.clientToken).toBeTruthy();
      expect(standard.available).toBe(true);
      expect(premium.available).toBe(true);
      await expect(standardButton).toBeEnabled();
      await expect(premiumButton).toBeEnabled();
    }
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

});
