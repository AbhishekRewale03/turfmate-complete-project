# Implementation status

Verified credential-free implementation as of 4 September 2026:

- Server-authoritative booking, pricing, holds, deterministic slot locks, manual bookings, blocks, operating hours, profile projection, settings, and reports.
- Cashfree order, signed payment webhook, reconciliation, cancellation, persistent refund, signed refund webhook, deduplication, and refund reconciliation flows.
- Firebase owner authentication, active tenant membership, central permissions, secure session cookies, CSRF/origin checks, App Check modes, and distributed Firestore rate limiting.
- Complete customer and owner Firebase-mode screen adapters behind one typed API client; local mode remains an explicit standalone demo.
- Tenant-scoped and bounded realtime listeners for today, selected day, upcoming bookings, booking detail, and active holds.
- Unit, API contract, payment, refund, Firestore rules, Storage rules, and 31-scenario Playwright emulator coverage.

The final Block 7 audit, API inventory, index map, persistence classification, and credential-dependent checklist are in `docs/credential-free-final-audit.md`.

`NEXT_PUBLIC_DATA_MODE=local` intentionally remains the checked-in default. Firebase mode does not read or write demo business records and does not silently fall back to local data.

## Credential-dependent work remaining

- Deploy to separate staging Firebase/Cashfree projects and configure secrets in the hosting secret manager.
- Register the web app for reCAPTCHA Enterprise App Check, validate monitor telemetry, then enable enforcement.
- Verify Cashfree sandbox Hosted Checkout, signed payment/refund webhook delivery over public HTTPS, Get Order/Get Refund reconciliation, dashboard visibility, and duplicate delivery behavior.
- Validate scheduled reconciliation, observability, backups/retention, domain allowlisting, and a rollback drill.

These external checks are intentionally not claimed as complete. Do not describe the application as production-ready until they pass.
