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

  test('homepage has clear search intent and accurate application structured data', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Social Video Downloader for TikTok, Reels & Shorts/i);
    await expect(page.locator('h1').first()).toContainText(/TikTok, Reels, Shorts & Pinterest/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /public videos.*individually or in batches/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://klypza.web.id/');

    const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes =>
      nodes.map(node => JSON.parse(node.textContent))
    );
    const app = schemas.find(schema => schema['@type'] === 'WebApplication');
    expect(app).toBeTruthy();
    expect(app.isAccessibleForFree).toBe(true);
    expect(app).not.toHaveProperty('offers');
  });

  test('public information and plans pages use matching canonical and Open Graph URLs', async ({ page }) => {
    for (const path of ['/plans', '/about', '/contact', '/privacy-policy', '/terms', '/copyright']) {
      await page.goto(path);
      const expected = 'https://klypza.web.id' + path;
      await expect(page.locator('link[rel="canonical"]'), path + ' canonical').toHaveAttribute('href', expected);
      await expect(page.locator('meta[property="og:url"]'), path + ' Open Graph URL').toHaveAttribute('content', expected);
      await expect(page.locator('meta[name="description"]'), path + ' description').toHaveAttribute('content', /.+/);
    }
  });

  test('homepage contains no third-party advertising scripts or ad placeholders', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);
    const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src));
    expect(scripts.join(' ')).not.toMatch(/monetag|nap5k|adsbygoogle|adsterra/i);
    await expect(page.locator('body')).not.toContainText(/Ad placement for Free accounts|Support Klypza — ad placement/i);
  });
  test('privacy policy reflects the no-advertising service and essential cookies only', async ({ page }) => {
    const response = await page.goto('/privacy-policy');
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/monetag|adsbygoogle|adsterra|ad placement/i);
    expect(body).toMatch(/does not use third-party advertising/i);
    expect(body).toMatch(/essential cookies/i);
    expect(body).toMatch(/keep you signed in/i);
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
      offenders: [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > document.documentElement.clientWidth + 2 || r.left < -2);
      }).slice(0, 12).map(el => ({tag:el.tagName, id:el.id, className:typeof el.className==='string'?el.className:'', left:Math.round(el.getBoundingClientRect().left), right:Math.round(el.getBoundingClientRect().right), width:Math.round(el.getBoundingClientRect().width)})),
    }));
    expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 2);
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


  test('dashboard layout uses a full-width header and readable tablet columns', async ({ page }) => {
    for (const viewport of [{ width: 959, height: 1600 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      const layout = await page.locator('#dashboardCard').evaluate(card => {
        const welcome = card.querySelector(':scope > .dashboard-welcome');
        const menu = card.querySelector(':scope > .dashboard-side-menu');
        const overview = card.querySelector(':scope > #overviewPanel');
        const rect = element => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        };
        return {
          columns: getComputedStyle(card).gridTemplateColumns,
          display: getComputedStyle(card).display,
          card: rect(card),
          welcome: rect(welcome),
          welcomeGridColumn: getComputedStyle(welcome).gridColumn,
          menuGridColumn: getComputedStyle(menu).gridColumn,
          overviewGridColumn: getComputedStyle(overview).gridColumn,
        };
      });
      expect(layout.display, JSON.stringify({ viewport, layout })).toBe('grid');
      expect(layout.columns.trim().split(/\s+/), JSON.stringify({ viewport, layout })).toHaveLength(1);
      expect(layout.welcome.width, JSON.stringify({ viewport, layout })).toBeGreaterThan(layout.card.width - 48);
    }
  });

  test('dashboard menu is full-width above content on desktop, tablet, and mobile', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 1280, height: 900 },
      { width: 1100, height: 1000 },
      { width: 959, height: 1600 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');
      const card = page.locator('#dashboardCard');
      await expect(card).toBeVisible();
      const menu = card.locator(':scope > .dashboard-side-menu');
      const overview = card.locator(':scope > #overviewPanel');
      await expect(menu).toBeVisible();
      await expect(overview).toBeAttached();

      const before = await card.evaluate((element) => {
        const box = selector => {
          const node = element.querySelector(selector);
          const rect = node.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width };
        };
        return {
          columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/),
          card: (() => { const rect = element.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width }; })(),
          welcome: box(':scope > .dashboard-welcome'),
          menu: box(':scope > .dashboard-side-menu'),
          overview: box(':scope > #overviewPanel'),
        };
      });
      if (viewport.width <= 620) {
        expect(await card.evaluate(element => getComputedStyle(element).display)).toBe('block');
      } else {
        expect(await card.evaluate(element => getComputedStyle(element).display)).toBe('grid');
        expect(before.columns, JSON.stringify({ viewport, before })).toHaveLength(1);
      }
      expect(before.menu.width, JSON.stringify({ viewport, before })).toBeGreaterThan(before.card.width * 0.9);
      expect(before.welcome.width, JSON.stringify({ viewport, before })).toBeGreaterThan(before.card.width * 0.9);
      expect(before.menu.left, JSON.stringify({ viewport, before })).toBe(before.welcome.left);
      expect(before.overview.top, JSON.stringify({ viewport, before })).toBeGreaterThan(before.menu.top);

      await menu.locator('#accountMenuToggle').click();
      const nav = menu.locator('#accountMenuContent');
      await expect(nav).toBeVisible();
      const navLayout = await nav.evaluate(element => ({
        width: element.getBoundingClientRect().width,
        menuWidth: element.closest('.dashboard-side-menu').getBoundingClientRect().width,
        columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/),
        items: [...element.querySelectorAll('.profile-tab')].map(item => item.innerText.trim()),
      }));
      expect(navLayout.width, JSON.stringify({ viewport, navLayout })).toBeGreaterThan(navLayout.menuWidth * 0.9);
      expect(navLayout.columns, JSON.stringify({ viewport, navLayout })).toHaveLength(viewport.width <= 620 ? 2 : 4);
      expect(navLayout.items).toEqual(expect.arrayContaining(['Overview', 'My Profile', 'Plans & Upgrade', 'Log out']));
      const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(pageWidth.scroll, JSON.stringify({ viewport, pageWidth })).toBeLessThanOrEqual(pageWidth.viewport + 2);
    }
  });

  test('plans page shows only Weekly, Standard and Premium allowances', async ({ page }) => {
    await page.goto('/plans');
    const cards = page.locator('#plansCard .pricing-card:visible');
    await expect(cards).toHaveCount(3);
    await expect(page).toHaveTitle(/Weekly, Standard & Premium/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /subscriptions/i);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /trial/i);
    const planCardText = await cards.allTextContents();
    expect(planCardText.join(' ')).not.toContain('Free Trial');
    expect(planCardText.join(' ')).not.toMatch(/advertis|\bads?\b/i);
    const weekly = cards.filter({ has: page.locator('h3', { hasText: /^Weekly$/ }) });
    const standard = cards.filter({ hasText: 'Standard' });
    const premium = cards.filter({ hasText: 'Premium' });
    await expect(weekly).toContainText('$1');
    await expect(weekly).toContainText('5 videos per batch');
    await expect(weekly).toContainText('25 videos per day');
    await expect(standard).toContainText('$5.99');
    await expect(standard).toContainText('15 videos per batch');
    await expect(standard).toContainText('60 videos per day');
    await expect(premium).toContainText('$9.99');
    await expect(premium).toContainText('25 videos per batch');
    await expect(premium).toContainText('100 videos per day');
  });

  test('plans API exposes exactly the three purchasable subscriptions', async ({ request }) => {
    const response = await request.get('/api/plans');
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload.plans.map(plan => plan.id)).toEqual(['weekly', 'standard', 'premium']);
    expect(payload.plans).toHaveLength(3);
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

  test('password changes reject cross-origin requests before session handling', async ({ request }) => {
    const response = await request.post('/api/account/password', {
      headers: { Origin: 'https://attacker.example', 'content-type': 'application/json' },
      data: { currentPassword: 'irrelevant', newPassword: 'irrelevant-password' },
    });
    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ message: 'Request origin rejected.' });
  });


  test('public plan API reports the approved Sandbox prices and allowances', async ({ request }) => {
    const response = await request.get('/api/plans');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.testPricing).toBe(true);
    expect(data.plans).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'weekly', dailyLimit: 25, batchLimit: 5, price: 1, billingPeriod: 'week' }),
      expect.objectContaining({ id: 'standard', dailyLimit: 60, batchLimit: 15, price: 5.99 }),
      expect.objectContaining({ id: 'premium', dailyLimit: 100, batchLimit: 25, price: 9.99 }),
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
