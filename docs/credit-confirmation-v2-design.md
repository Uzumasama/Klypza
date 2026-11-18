# Credit Confirmation V2 — isolated development

## Scope and safety
This work is isolated on `feature/credit-confirmation-v2`. No production Worker, D1 database, Paddle subscription, or `main` branch is modified.

## Intended credit lifecycle
1. Processing a source link creates signed download options and a pending reservation; it does not debit credits.
2. Quota reservation is enforced atomically and counts outstanding reservations so concurrent processing cannot oversubscribe daily/batch limits.
3. Browser fetches a file and verifies a non-empty Blob before acknowledgement.
4. The browser acknowledges using a server-issued pending ID/token. The server validates ownership, expiry, token, source identity, and transfer metadata.
5. The charge is idempotent and unique by user + canonical source identity, not quality. Multiple quality options for one source count at most once.
6. Failed, empty, cancelled, or expired transfers do not charge. Reservations are released/expired.
7. ZIP: acknowledge only successful, non-empty file Blobs that are included in the archive. If ZIP generation fails before a successful archive is produced, the design should avoid charging items that were not acknowledged under the chosen ZIP semantics.

## Important limitation
Browser acknowledgement proves the browser received a non-empty Blob, not that the user successfully saved it to permanent storage. The browser cannot reliably confirm filesystem persistence across browsers/devices.

## Required acceptance scenarios
- successful transfer -> one debit
- upstream failure -> zero debit
- empty Blob -> zero debit
- repeated acknowledgement -> no additional debit
- same source, different qualities -> at most one debit
- ZIP with 5 successful items -> 5 debits
- ZIP with 5 items and 2 failures -> 3 debits
- ZIP archive generation failure -> no charge for unconfirmed items
- cancellation before transfer -> zero debit
- concurrent requests cannot exceed quota
- token belonging to another user -> rejected
- expired token -> rejected

## Implementation sequence
1. Add isolated pure-function tests for canonical source identity, acknowledgement validation, and stable charge key.
2. Implement D1 reservation/acknowledgement transactions and migration in the feature branch.
3. Integrate routes and browser/ZIP flow in the Worker, preserving existing UI.
4. Run unit tests, syntax checks, and non-production integration tests.
5. Review diff and CI; only merge/deploy after explicit approval.
