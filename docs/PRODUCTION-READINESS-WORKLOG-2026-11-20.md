# Production Readiness Work Log — 2026-11-20

## Scope

Work branch: `fix/production-readiness-2026-11-20`, based on `integration/production-worker-reconciliation`.

Production Worker: `klypza-app`  
Staging Worker: `klypza-staging`  
Production D1: `klypza_accounts`  
Staging D1: `klypza-qa`

No production Worker deployment, production D1 write, user deletion, payment action, or production secret change was performed during this work.

## Confirmed infrastructure

- Production Worker has D1, assets, SaveAPI, Resend and Paddle secret bindings.
- Staging Worker has its own D1 database and has SaveAPI and Resend secrets.
- Staging Worker retains its SaveAPI and Resend secret bindings. It does not yet have Paddle API key, Paddle client token, or Paddle webhook secret bindings.
- The staging D1 database contains the expected application tables.
- The Cloudflare account has not enabled R2. A D1 export operation completed, but a durable independently retained backup still needs to be created and verified before production deployment.

## Production database

A read-only inspection confirmed that production contains test data and must be preserved:
- 3 user records
- 3 payment orders (2 completed, 1 pending)
- 5 subscription records
- 103 usage events
- 127 pending-download records

Pending-download status counts at inspection:
- 17 cancelled
- 26 completed
- 45 pending
- 39 ready

All 84 pending/ready records were expired at inspection time. They were not deleted or modified. Expired records do not count toward active quota reservations because reservation queries check `expires_at`.

## Changes made on this branch

### Quota and onboarding
- Free daily allowance changed from 10 to 5.
- New-user welcome credits changed from 10 to 5.
- Registration, verification email, verification success page and public plan API copy now state 5 free daily credits.
- Standard remains 60/day and batch 15.
- Premium remains 100/day and batch 25.

### Download and credit lifecycle
- The quota reservation is now activated only after the upstream provider has returned a valid file response.
- Credit consumption is deferred until the response stream completes.
- A cancelled stream releases its pending reservation without recording a usage event.
- The browser sends a cancellation request when an in-progress transfer is aborted.
- Failed upstream requests and oversized files do not consume a credit.
- A download token remains single-use and user-bound.

### Paddle billing
- Paddle API host now follows `PADDLE_ENV` (`sandbox` by default, `production` when explicitly configured).
- Paddle.js initializes Sandbox only when the configured environment is Sandbox.
- Production checkouts require explicit `PADDLE_STANDARD_PRICE_ID` and `PADDLE_PREMIUM_PRICE_ID`; the Worker refuses production checkout if they are missing.
- Sandbox test prices remain $1/month and $2/month.
- Production display prices are $4.99/month and $8.99/month.
- Paid entitlement now follows the Paddle subscription state. Cancelled, paused or expired subscriptions no longer inherit a stale paid `users.plan`; past-due access is limited to a still-paid billing period.
- Subscription webhook processing updates both subscription state and the user's plan.

### Tests and documentation
- Public plan E2E expectation updated to Free 5/day.
- Added unauthenticated download-cancellation protection test.
- Added unsigned Paddle webhook rejection test.
- Added release, billing and credit lifecycle documentation.

## Validation status

The code changes have been committed to the feature branch. The updated Worker was uploaded successfully to `klypza-staging` using the isolated `klypza-qa` D1 binding; Cloudflare accepted the module and reported a 1 ms startup time. The staging secret bindings for SaveAPI and Resend were preserved. A reproducible `wrangler.staging.toml` and GitHub Actions staging deploy + Playwright workflow have been added. Browser test results have not yet been confirmed; the workflow needs to complete before staging can be considered validated.

## Remaining release gates

1. Retain a durable private production D1 backup outside the database and verify its size and integrity.
2. Add Paddle Sandbox secrets to the staging Worker using the Paddle dashboard; secret values cannot be read back from Cloudflare and must not be copied from production by attempting to retrieve them.
3. Configure the missing Paddle Sandbox secrets on `klypza-staging`; then run the isolated staging deployment and Playwright workflow.
4. Run browser tests against staging for registration, email verification, login/logout, profile, reset password, plan display, batch limits, cancellation, successful download, quota accounting, and ZIP batches.
5. Run Paddle Sandbox checkout, webhook, subscription activation, portal, cancellation, renewal and duplicate-event tests using a controlled verified test account.
6. Confirm Free accounts see Monetag ads and Standard/Premium accounts do not.
7. Verify production Paddle credentials, production price IDs and production webhook destination before any live billing switch.
8. Re-run the production API and browser smoke tests after the release candidate is deployed.
9. Only then review and deploy the candidate Worker to `klypza-app`.

## Important

The feature branch is not yet a completed production release. The changes above are code-level fixes; live billing and end-to-end download reliability remain unverified until staging tests pass. Preserve all existing production test accounts and transactions.
