# Deployment

Create separate Firebase and Cashfree projects for staging and production. Configure every variable in `.env.example` through the hosting secret manager. Deploy Firestore rules, indexes, and Storage rules before application traffic. Set `NEXT_PUBLIC_DATA_MODE=firebase` only in a fully configured environment; the repository default remains `local` for the standalone demo.

Use `APP_CHECK_MODE=monitor` in staging, inspect invalid-token telemetry, and move to `enforce` only after reCAPTCHA Enterprise registration is confirmed. Production uses the Firestore rate-limit adapter automatically. Schedule payment reconciliation, refund reconciliation, and `/api/internal/expire-holds` with `Authorization: Bearer $CRON_SECRET`.

Before launch verify the canonical HTTPS origin, secure cookies, owner email verification, App Check, Cashfree domain allowlisting, signed payment and refund webhooks, duplicate delivery, Get Order/Get Refund reconciliation, alerting for mismatches and failed refunds, backups/retention, secret scanning, and rollback procedures. Do not switch Cashfree to production until the sandbox checklist passes.
