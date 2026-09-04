# Operations runbook

## Payment pending

Call the protected reconciliation endpoint for stale `CREATED`/`ACTIVE`/`FAILED` Cashfree orders. A paid provider order is finalized once; amount or currency mismatch is quarantined for investigation. Never manually set an unverified order to paid.

## Paid hold near expiry

Run reconciliation before finalization. If the ACTIVE hold deadline has passed, `/api/internal/expire-holds` releases only HOLD locks. A payment verified after release is retained as `REQUIRES_ATTENTION`; never recreate or steal a lock that may now belong to another booking.

## Manual UPI awaiting verification

`PAYMENT_PENDING` means the customer claimed payment before the deadline; it is not proof of success. Keep its slot locked until an authorized owner verifies their bank/UPI history and approves or rejects it. Normal ACTIVE-hold cleanup must never release this review lock. Direct UPI refunds are manual owner actions.

## Webhook failures

Check request IDs and provider delivery logs, confirm the exact raw body reached the handler, verify clock skew is below five minutes, and rotate secrets only through the secret manager. Replay the provider event after correcting configuration.

## Slot conflict

Do not delete booking locks to force a booking. Locate the booking/hold/block resource, resolve it through its normal cancellation or reconciliation flow, and retain an audit event.

## Refund pending or failed

Use the protected refund reconciliation endpoint for uncertain refunds. Mark a booking `REFUNDED` only after Cashfree reports verified success. Keep failed/cancelled refund records visible for operations; never discard or recreate them under a different idempotency key.

## Incident response

Disable public booking via the safe turf projection, preserve logs/audit records, rotate affected credentials, and verify tenant boundaries. Restore booking only after reconciliation and an overlap scan. Cashfree sandbox and live webhook validation remain launch gates.
