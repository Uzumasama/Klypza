# Credit Confirmation V2 — reservation ledger notes

This migration is proposed for the isolated feature branch only. **Do not apply it to production.**

## Reservation table
A reservation is created before processing is allowed to continue. Only active (reserved, unexpired) reservations count against the user's daily and batch limits alongside already-confirmed usage. A reservation is released for failures/cancellations, or becomes expired after its TTL. Confirmation changes it to confirmed.

## Charge ledger
The unique constraint `UNIQUE(user_id, source_identity)` means quality variants and repeated attempts for the same canonical source cannot charge twice. The reservation reference is also unique. The final D1 batch should insert the charge ledger row, usage event, credit transaction, download history, and mark reservation confirmed in one atomic batch, with every subsequent statement gated on the newly inserted charge row. Duplicate acknowledgement returns an idempotent result and does not create additional ledger entries.

## Concurrency design requirement
Quota decisions must be performed by conditional INSERT statements that include both confirmed usage and active reservations in their count predicates. Never rely on a read-then-write check alone. Cloudflare D1 `batch()` executes statements transactionally; all writes in the confirmation batch must be conditional on the reservation ownership, status, token hash, expiry, and successful insertion of the unique charge row.

## Remaining implementation
- Implement reservation creation and release with atomic quota conditions.
- Replace charge-at-processing in both generic SaveAPI and YouTube info routes.
- Add file-transfer acknowledgement endpoint and browser acknowledgement after a non-empty Blob is received.
- Add ZIP acknowledgements only after the archive generation and save-trigger step succeed, and define partial-failure semantics.
- Tests for race limits, duplicate acknowledgements, token ownership, expiry, failed/empty/cancelled transfers, and ZIP success/failure.
