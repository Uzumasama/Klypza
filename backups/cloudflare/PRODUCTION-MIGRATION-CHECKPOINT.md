# Klypza production migration checkpoint — 2026-11-15

## Production target
- Cloudflare Worker: `klypza-app`
- Custom domain: `klypza.web.id` (currently attached to `klypza-app`)
- D1 database: `klypza_accounts`
- D1 database ID: `72c5379f-cd8d-41c0-b997-8bebdb0a3876`

## Production Worker source archive
- Full production Worker module was retrieved from Cloudflare's script content endpoint.
- Archived file: `backups/cloudflare/klypza-app-production-worker-2026-11-15.mjs`
- Archived on branch: `backup/klypza-app-production-2026-11-15`
- Source size: 302,242 characters.
- Archive commit: `04168da4b2785184294dcde6f64c9061ad5423ee`
- The source references Cloudflare environment bindings for API secrets; the archive does not contain the live secret values.
- The archive is in the existing GitHub repository. The repository's visibility should be considered before sharing this source snapshot publicly.

## Latest D1 backup export
A new full D1 SQL export was successfully generated on 2026-11-15.
- Export filename: `72c5379f-cd8d-41c0-b997-8bebdb0a3876-00000140-00000000-00005124-502dca84d90f34de23f735f60acb31ab.sql`
- Bookmark: `00000140-00000000-00005124-502dca84d90f34de23f735f60acb31ab`
- Export status: complete
- The signed download URL is temporary and must not be treated as a permanent backup.
- **The SQL dump has not yet been retained in permanent private storage.** This manifest is not the SQL dump.

## Read-only row-count snapshot
- users: 3
- downloads: 103
- credit_transactions: 105
- pending_downloads: 127
- payment_orders: 3
- subscriptions: 5

## Production Worker bindings observed
- D1 binding `KLYPZA_DB` -> existing `klypza_accounts`
- Secret bindings: `SAVEAPI_KEY`, `RESEND_API_KEY`, `PADDLE_API_KEY`, `PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`

## Code comparison findings
- Production Worker includes billing/Paddle routes and token-based download completion logic.
- Latest GitHub main Worker lacks Paddle implementation and does not contain the full production pending-download consume flow.
- Do not replace production source wholesale with the latest GitHub main source.

## Safety status
- No D1 rows were modified.
- No production Worker code, bindings, secrets, routes, or custom domain were modified.
- Cloudflare R2 is not enabled on this account, so it cannot currently be used as a private backup destination.
- Do not delete either Worker until the SQL dump is safely retained privately and the deployment workflow is reconciled and validated.

## Monetag integration verification (2026-11-15)
- User confirmed Klypza uses Monetag to show ads to free-plan users.
- The production Worker contains the Monetag verification meta tag, a free-plan-only ad loader for zone `12250392` via `https://nap5k.com/tag.min.js`, and a root `/sw.js` response configured for zone `12250376` via `https://3nbf4.com/act/files/service-worker.min.js?r=sw`.
- These are retained as Monetag-related integration points; do not remove or rewrite them as unrelated advertising code without checking the publisher dashboard and exact zone formats.
- The Monetag Help Center confirms that Push Notifications and MultiTag formats require the provider's `sw.js` file at the site root, and that ad tags should be copied exactly from the publisher dashboard. References: https://help.monetag.com/en/articles/6726318-how-do-i-get-started-as-a-publisher-paste-the-ad-tag-into-your-website and https://help.monetag.com/en/articles/6745314-i-don-t-see-any-ads-on-my-site-what-should-i-do.
- The GitHub `main` Worker currently does not include the production Monetag controller or `/sw.js` handler; preserve the production version during reconciliation.

## Reconciliation audit findings (2026-11-15)
- Confirmed the Monetag integration is intentional per the user. The production-only `/sw.js` handler and free-plan ad loader must be preserved; no ad code was removed.
- The current GitHub `main` deployment config still sets Wrangler Worker name to `klypza`, while the custom-domain production Worker is `klypza-app`. Do not merge or deploy production code until this target mismatch is deliberately resolved.
- Production Paddle checkout and subscription portal currently call `sandbox-api.paddle.com`, use sandbox price IDs, and return `environment: 'sandbox'`. Paid checkout is therefore in sandbox mode; do not present it as live billing or switch to live API until live Paddle products/price IDs and webhook configuration are verified.
- GitHub `main` is missing production Paddle handlers, production Monetag controllers, and secure pending-download consumption logic. A full replacement in either direction is unsafe without a selective code reconciliation and schema review.
- No production code, Worker routing, secrets, or database rows were changed during this audit.
