# Klypza production migration checkpoint — 2026-11-15

## Production target
- Cloudflare Worker: `klypza-app`
- Custom domain: `klypza.web.id` (currently attached to `klypza-app`)
- D1 database: `klypza_accounts`
- D1 database ID: `72c5379f-cd8d-41c0-b997-8bebdb0a3876`

## D1 backup export
A Cloudflare D1 SQL export was successfully generated on 2026-11-15.
- Export filename: `72c5379f-cd8d-41c0-b997-8bebdb0a3876-0000013f-00000000-00005124-f857a3a422790e00bec9304cf69c13de.sql`
- Bookmark: `0000013f-00000000-00005124-f857a3a422790e00bec9304cf69c13de`
- Export status: complete
- This manifest records the export metadata; it is not itself the SQL dump.

## Read-only row-count snapshot at checkpoint
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
- Production Worker source is larger and includes billing/Paddle routes and token-based download completion logic.
- Latest GitHub main Worker lacks Paddle implementation and does not contain the production pending-download consume flow.
- Production Worker includes a static-asset fallback; its Cloudflare settings did not expose an explicit ASSETS binding in the inspected binding list.
- Do not replace production source wholesale with the latest GitHub main source.

## Safety status
- No D1 rows were modified.
- No production Worker code, bindings, secrets, routes, or custom domain were modified.
- Do not delete either Worker until code and deployment workflow are reconciled and the SQL export is retained outside its temporary export URL.
