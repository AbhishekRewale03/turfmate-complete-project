# Credential-free delivery record

## Changed implementation areas

This repository has no tracked baseline, so Git cannot produce a reliable historical changed-file diff. The migration work is concentrated in:

- `app/api/**` — authentication, public booking/payment, owner CRUD/reporting, reconciliation, and webhook routes.
- `app/owner/**` and `app/t/**` — explicit local/Firebase adapter selection without changing route URLs.
- `components/customer/firebase-customer-pages.tsx` and `components/owner/firebase-owner-pages.tsx` — Firebase/API-backed approved screens and integration states.
- `lib/api/**`, `lib/auth/**`, `lib/config/**`, `lib/firebase/**`, `lib/payments/**`, `lib/rate-limit/**`, `lib/repositories/**`, and `lib/services/**` — typed client, security, persistence, payment/refund, limiter, and domain services.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `playwright.config.ts`, `instrumentation.ts`, `tests/**`, `scripts/**`, `.env.example`, `package.json`, and this `docs/**` set.

## Completed APIs

- Auth: session/CSRF exchange, current session, active-tenant selection.
- Public: turf projection, availability, holds, payment-order creation, payment retry/status, booking lookup/detail, and customer cancellation.
- Owner: dashboard, bookings create/read/update/cancel/mark-paid, blocks CRUD, pricing CRUD, operating hours, turf profile/public projection, booking settings, and reports.
- Internal/provider: payment reconciliation, refund reconciliation, signed Cashfree payment webhook, and signed Cashfree refund webhook.

## Migrated screens

- Customer: turf/slot selection, details, payment/verification, success, lookup, booking detail, cancellation, and refund status.
- Owner: login/onboarding, dashboard, bookings/list/detail/create, calendar, blocks/create/edit, pricing, hours, profile, booking settings, reports, more, and logout.

## Remaining browser storage

- `lib/data/local-repository.ts` uses `localStorage` only for the explicit standalone local demo selected by `NEXT_PUBLIC_DATA_MODE=local`.
- `lib/data/firebase-draft.ts` and Firebase customer pages use `sessionStorage` only for ephemeral booking drafts, random customer-session IDs, idempotency keys, and scoped access tokens. They do not store authoritative bookings, prices, payments, or refunds.

## Firestore indexes

- Bookings: `bookingStatus ASC + startAt ASC`, `source ASC + startAt DESC`, `paymentStatus ASC + updatedAt DESC`.
- Holds: `status ASC + expiresAt ASC`.
- Slot locks: `turfId ASC + slotStartAt ASC`.
- Blocks: `endAt ASC`.
- Audit logs: `createdAt DESC`.
- Refunds: `status ASC + updatedAt ASC`.

## Required environment variables

- Public Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`, `NEXT_PUBLIC_DATA_MODE`.
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, and either Application Default Credentials or `FIREBASE_CLIENT_EMAIL` plus `FIREBASE_PRIVATE_KEY`.
- Application/security: `APP_URL`, `APP_ENV`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_MAX_AGE`, `BOOKING_LOOKUP_HMAC_SECRET`, `CRON_SECRET`, `APP_CHECK_MODE`.
- Payments: `PAYMENT_PROVIDER`, `PAYMENT_SETTLEMENT_MODE`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENV`, `CASHFREE_API_VERSION`, `NEXT_PUBLIC_CASHFREE_MODE`.
- Local emulator processes additionally use `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, and `FIREBASE_STORAGE_EMULATOR_HOST`.

Exact commands and current results belong in `docs/testing.md`; external credential-dependent launch checks are in `docs/implementation-status.md` and `docs/deployment.md`.
