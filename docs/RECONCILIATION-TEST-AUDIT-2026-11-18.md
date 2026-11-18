# Klypza Reconciliation & Test Audit — 2026-11-18

## Scope and safety
- Work branch: `integration/production-worker-reconciliation`
- Production custom domain: `https://klypza.web.id`
- Production Worker: `klypza-app`
- No production deployment, database mutation, secret change, or branch merge was performed.

## CI and browser test results
- Worker syntax and Wrangler v4.162.0 dry-run validation: PASS (Node 22.12.0).
- Playwright public-site smoke tests against the production custom domain: 16/16 passed on the earlier run, including desktop and mobile layouts, public/legal pages, health endpoint, and unauthenticated account/batch/download protections.
- Additional safe registration validation checks: PASS (missing name, malformed email, short password rejected before account creation).
- New plan API expectations test: FAIL on live production (2 device variants), identifying a production configuration mismatch. This test is intentionally a deployment gate and should remain failing until the production plan API is reconciled.

## Confirmed production plan API mismatch
Live `GET /api/plans` currently returns:
- Free: 10/day, batch 5, ads on.
- Standard: 90/day, batch 15, price 0.10, `available:false`.
- Premium: 150/day, batch 25, price 0.20, `available:false`.

The intended plan configuration documented in the production reconciliation Worker and prior user decisions is:
- Free: 10/day, batch 5.
- Standard: 60/day, batch 15, sandbox price $1/month, available.
- Premium: 100/day, batch 25, sandbox price $2/month, available.

The live endpoint therefore has mismatched quotas/prices and marks paid plans unavailable. This also blocks real sandbox checkout testing through the current live plan UI/API. The integration Worker contains the intended 60/100 limits and $1/$2 sandbox test pricing, but it is not deployed.

## Lighthouse baseline on production custom domain
Lighthouse CI succeeded for home, About, Privacy Policy, and Terms pages.
- Homepage: Performance 78, Accessibility 95, Best Practices 96, SEO 100.
- About: Performance 100, Accessibility 94, Best Practices 96, SEO 100.
- Privacy Policy: Performance 100, Accessibility 94, Best Practices 96, SEO 100.
- Terms: Performance 100, Accessibility 95, Best Practices 96, SEO 100.

Homepage issues identified:
- Render-blocking Google Fonts and Font Awesome stylesheets; estimated render-blocking savings about 1.49 seconds.
- CLS 0.106, primarily caused by web-font loading.
- LCP 3.8 seconds; hero heading render delay is the main contributor.
- Contrast failures: stats note (`#9099ad`) and brand blue (`#2878f0`) on white.
- Wordmark image is oversized for displayed dimensions (estimated 9 KiB savings).

Branch-only proposed improvements:
- Load Google Fonts and Font Awesome non-blocking with preload/onload and noscript fallbacks.
- Darken brand blue to `#1d5fc4` and stats note to `#68738a` for contrast.
- These source changes are validated by syntax/dry-run CI but not yet deployed, so Lighthouse scores above are production baseline, not post-fix measurements.

## Backup
- Private D1 backup helper is present at `scripts/backup-d1.sh`.
- It is location-independent, pins Wrangler v4.162.0, checks login, exports remote D1, verifies a non-empty SQL file, and copies Worker source/config.
- Private SQL backup is not yet executed or retained. This remains the main safety blocker.

## Reconciliation notes
- GitHub main is 4 commits ahead of the integration branch. Main's recent commits include canonical README update, production Lighthouse workflow, E2E workflow, and deployment configuration.
- Integration Worker source is substantially larger than main and contains Paddle sandbox handlers, Monetag integration, and secure pending-download consume flow. Do not replace integration Worker with main's older Worker.
- Integration deploy workflow has a main-only guard. Main deploy workflow lacks that guard; retain the safer integration branch guard during future reconciliation.
- Authenticated signup/email verification, Paddle checkout/webhook, paid subscription management, download completion/credit consumption, and cancellation still need controlled tests. Email inbox verification is not available in this environment; do not create unverified test accounts or charge any real payment.

## Next safe steps
1. Retain private D1 SQL export (local Wrangler CLI or other private method).
2. Reconcile the four main commits selectively (README and workflows/config only; do not overwrite production Worker).
3. Use a controlled verified email account to test registration/login and Paddle sandbox checkout/webhook.
4. Re-test download credit charging, cancellation, batch limits, and subscription status.
5. Review branch-only homepage optimization on a staging Worker before considering production deployment.
