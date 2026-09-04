# Block 7 credential-free final audit

Audited 4 September 2026 against the repository implementation. TurfMate has passed credential-free local/emulator verification. Real Firebase infrastructure, App Check enforcement, Cashfree Hosted Checkout, public webhooks, refunds, cron delivery, and production deployment have **not** been verified; the application is not yet claimed production-ready. The checked-in default remains `NEXT_PUBLIC_DATA_MODE=local`.

## A-C. Architecture and data modes

Next.js App Router pages select one of two explicit adapters. Local demo pages use `stores/turfmate-store.ts` and `lib/data/local-repository.ts`; this browser-authoritative mode is intentionally non-production. Firebase pages use `components/customer/firebase-customer-pages.tsx` and `components/owner/firebase-owner-pages.tsx`, the typed `lib/api/client.ts` boundary, server-only services/repositories, Firebase Auth/session cookies, and Firestore. Selection is explicit and compile-time; Firebase errors never fall back to local booking creation and records are never mixed.

Server services are authoritative for tenant resolution, availability, pricing, holds, deterministic slot locks, bookings, payments, cancellation, refunds, reconciliation, and audit records. Browser calculations are presentation only.

## D-G. Workflows and state machines

- Manual UPI: available -> `ACTIVE` hold/order -> customer pays externally -> **I've Paid** -> hold/order `PAYMENT_PENDING` -> owner approval -> order `PAID`, hold `CONVERTED`, locks become `BOOKING`, booking `CONFIRMED`; rejection sets order `REJECTED`, hold `RELEASED`, and deletes locks. Unclaimed `ACTIVE` holds expire and release locks. The expiry worker deliberately selects only `ACTIVE`, so claimed `PAYMENT_PENDING` holds survive the original countdown.
- Cashfree: available -> `ACTIVE` hold and `CREATED`/`ACTIVE` order -> provider-verified `PAID` -> atomic confirmed booking. Failed or abandoned orders remain unconfirmed and expiration/reconciliation releases expired locks. A late verified payment after the lock is unavailable is marked `REQUIRES_ATTENTION`; finalization never recreates or steals a lock.
- Price snapshots: hold creation stores authoritative total, payable-now amount, currency, settlement mode, and price segments. Both Manual UPI approval and Cashfree finalization build the booking from that snapshot. Tests change the live pricing after hold creation and confirm the original price remains; new holds read current rules.
- Cancellation/refunds: cancellation is cutoff- and permission-checked and idempotent. Cashfree paid bookings create persistent refund records and reconcile signed callbacks/provider status. Paid Manual UPI cancellations set `manualRefundRequired` for owner and customer handling; no unsupported automatic UPI refund is invented.
- Slot state: availability -> deterministic `HOLD` locks -> `BOOKING` locks, or expiration/rejection -> locks deleted. Transactions reject an existing non-reclaimable lock.

## H-K. Permissions, realtime, rate limits, and App Check

Owner APIs verify a secure Firebase session, active membership in the selected tenant, and the route permission (`bookings:read`, `bookings:write`, `bookings:cancel`, `blocks:manage`, `pricing:manage`, `payments:manage`, `reports:read`, or `tenant:manage`). Mutations also enforce same-origin requests. Customer booking/payment access uses scoped, expiring, server-signed bearer tokens.

Realtime listeners first require Firebase Auth, resolve the active tenant through `/api/auth/me`, subscribe only below `tenants/{tenantId}`, and unsubscribe both auth and snapshot listeners on change/unmount. Queries are bounded: today/upcoming bookings 100, active holds 50, pending Manual UPI claims 50, payment attention 50, and a booking detail is one document. Snapshot errors are surfaced to the UI; Firestore SDK reconnect behavior is retained. Dashboard, list, calendar, claim queue, and attention queue therefore update without subscribing to booking history.

Public/customer routes use distributed Firestore rate limits: public turf and availability 60/minute (fail-open for read availability), lookup 8/minute, hold and payment creation 8/minute per client/session, detail/status 30/minute, and claim/retry/cancel 5/minute. Session exchange is 10/minute; each authorized internal job is 6/minute. `429 RATE_LIMITED` includes `Retry-After`. App Check supports `disabled`, `monitor`, and `enforce`; all public/customer data routes verify it. Credential-free tests use disabled mode except the explicit invalid-token enforcement test.

## L. Firestore collections and rules

`publicTurfs/{slug}` is a whitelisted public projection. Private records live under `tenants/{tenantId}`: turfs, members, settings, operating hours, pricing rules, holds, slot locks, bookings, blocks, payment-attempt owner projections, refunds, and audit logs. Server-only global collections are `bookingLocators`, `paymentOrders`, `refunds`, `webhookEvents`, and `rateLimits`; users have only their own `users/{uid}` read.

Rules allow the public projection read only when its keys are whitelisted, active members to read only their tenant tree, and a user to read their own user record. All client writes and all access to global security/payment collections are denied. Payment attempts inherit tenant isolation. Manual UPI public values are returned deliberately by the payment-order API; private settings remain tenant-readable only. Cashfree secrets are environment-only. Storage is default-deny because the app has no Firebase Storage feature. Firestore rules: 4 tests; Storage rules: 2 tests.

## M. Required composite indexes

| Scope / fields | Exact consumers |
| --- | --- |
| `holds` collection: `status ASC, expiresAt ASC` | authenticated active-holds realtime listener |
| `holds` collection group: `status ASC, expiresAt ASC` | global scheduled expired-hold cleanup |
| `holds` collection: `turfId ASC, status ASC, expiresAt ASC` | lazy expiration cleanup before availability/hold creation |
| `holds` collection: `customerSessionId ASC, status ASC` | reject concurrent pending Manual UPI claims for a customer session |
| `paymentAttempts`: `paymentCollectionMode ASC, status ASC, paymentClaimedAt DESC` | owner pending Manual UPI list and realtime listener |
| `paymentAttempts`: `status ASC, updatedAt DESC` | owner `REQUIRES_ATTENTION` realtime queue |
| `paymentOrders`: `status ASC, updatedAt ASC` | payment reconciliation for `CREATED`, `ACTIVE`, and `FAILED` |
| `slotLocks`: `turfId ASC, slotStartAt ASC` | date-range availability occupancy query |
| `refunds`: `status ASC, updatedAt ASC` | refund reconciliation for `REQUESTED`, `PENDING`, and `FAILED` |

Single-field `startAt` booking queries support dashboard, list, calendar, upcoming, and reports without a composite index. Single-field block `endAt`, pricing `turfId`, and slot-lock `resourceId` queries likewise use automatic indexes. Three unused booking composites and redundant one-field block/audit manifest entries were removed only after a complete call-site search found no matching query.

## Browser persistence audit

| Classification | References | Contents |
| --- | --- | --- |
| A — local demo, allowed | `lib/data/local-repository.ts` | demo tenants, demo business records, and demo owner session in `localStorage` |
| B — ephemeral Firebase customer state, allowed | `lib/data/firebase-draft.ts` | booking form draft and anonymous customer-session UUID in `sessionStorage` |
| B — ephemeral Firebase customer state, allowed | `components/customer/firebase-customer-pages.tsx` | scoped booking/payment access tokens and idempotency key in `sessionStorage` |
| B — Firebase authentication state, allowed | Firebase Auth SDK via `lib/firebase/client.ts` | SDK-managed owner sign-in persistence; no TurfMate business records |

There are no application IndexedDB calls, Firebase Storage calls, Firebase-mode business records in `localStorage`, legacy fallback writes, or class C/D references. Firebase SDK internals may use browser storage for auth/reconnect caches; TurfMate does not treat those caches as authoritative business data.

## N. Environment variables and secret boundary

| Area | Variables |
| --- | --- |
| Public Firebase/App Check | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` |
| Mode/public checkout mode | `NEXT_PUBLIC_DATA_MODE`, `NEXT_PUBLIC_CASHFREE_MODE` |
| Firebase server | `FIREBASE_PROJECT_ID`, optional `FIREBASE_STORAGE_BUCKET`, and ADC or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` |
| App/session security | `APP_URL`, `APP_ENV`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_MAX_AGE`, `BOOKING_LOOKUP_HMAC_SECRET`, `CRON_SECRET`, `APP_CHECK_MODE` |
| Cashfree/server payment | `PAYMENT_PROVIDER`, `PAYMENT_SETTLEMENT_MODE`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENV`, `CASHFREE_API_VERSION` |
| Build/test only | `NEXT_DIST_DIR` |

`.env.example` contains placeholders only. Firebase web configuration and public checkout mode are intentionally public. Admin credentials, HMAC/cron secrets, and Cashfree credentials are not `NEXT_PUBLIC_` and are imported only on server paths. The production client-bundle scan checks secret variable names, private-key markers, and known E2E secret values.

## Final API inventory (34 route files, 46 method/endpoints)

Legend: **AC** App Check; **RL** rate limit. Owner rows use secure session + active tenant + named permission, are tenant-scoped, and mutations require same origin. Their normal states are the stated entity/result plus the shared error envelope.

### Public bootstrap

| Method/path | Purpose | Authentication / AC / RL | Tenant scope and main states |
| --- | --- | --- | --- |
| `GET /api/public/tenants/{slug}` | safe turf projection | anonymous; AC; 60/min fail-open | slug resolves one tenant; turf or not-found/suspended |
| `GET /api/public/tenants/{slug}/availability` | priced available starts/durations | anonymous; AC; 60/min fail-open | resolved tenant/turf; availability or validation/not-found |

### Customer transaction/authorized

| Method/path | Purpose | Authentication / AC / RL | Tenant scope and main states |
| --- | --- | --- | --- |
| `POST /api/public/tenants/{slug}/holds` | create authoritative hold | anonymous session id; AC; 8/min | resolved tenant/turf; `ACTIVE`, conflict, expired/invalid |
| `POST /api/public/tenants/{slug}/payment-orders` | create/reuse payment attempt | anonymous session + idempotency; AC; 8/min | resolved tenant; `ACTIVE`/`CREATED`, booking, conflict |
| `POST /api/public/bookings/lookup` | verify booking ID + phone, issue token | phone proof; AC; 8/min | server locator tenant; booking or not-found |
| `GET /api/public/bookings/{bookingId}` | protected safe booking detail | booking bearer; AC; 30/min | locator tenant; confirmed/cancelled/refund state |
| `POST /api/public/bookings/{bookingId}/cancel` | cancel and request/flag refund | booking bearer + origin; AC; 5/min | locator tenant; cancelled, refund pending/manual required, cutoff errors |
| `POST /api/public/payments/{orderId}/claim` | submit Manual UPI claim | payment bearer + session + origin; AC; 5/min | order tenant; `PAYMENT_PENDING`, expired/conflict/rejected errors |
| `GET /api/public/payments/{orderId}/status` | reconcile/read protected payment | payment bearer; AC; 30/min | order tenant; created/active/pending/paid/failed/rejected/expired/attention |
| `POST /api/public/payments/{orderId}/retry` | explicit reconciliation retry | payment bearer + origin; AC; 5/min | order tenant; same payment states |

### Authentication and owner

| Method/path | Purpose | Permission / policy | Main result |
| --- | --- | --- | --- |
| `GET /api/auth/session` | issue CSRF token | anonymous | CSRF token/cookie |
| `POST /api/auth/session` | exchange Firebase ID token | CSRF + origin; 10/min | secure session + active tenant |
| `DELETE /api/auth/session` | sign out | origin | cookies cleared |
| `GET /api/auth/me` | current identity/tenant/permissions | owner session | identity |
| `POST /api/auth/active-tenant` | switch active membership | owner + origin | active tenant cookie |
| `GET /api/owner/dashboard` | tenant-local today summary | `bookings:read` | today, counts, revenue |
| `GET, POST /api/owner/bookings` | list / manual-create | `bookings:read` / `bookings:write` | bounded list / confirmed booking |
| `GET, PATCH /api/owner/bookings/{id}` | detail / update | `bookings:read` / `bookings:write` | booking / updated |
| `POST /api/owner/bookings/{id}/cancel` | owner cancellation | `bookings:cancel` | cancelled/refund state |
| `POST /api/owner/bookings/{id}/mark-paid` | collect balance | `payments:manage` | `PAID` |
| `GET, POST /api/owner/blocks` | list / create block | `bookings:read` / `blocks:manage` | bounded future blocks / block |
| `GET, PATCH, DELETE /api/owner/blocks/{id}` | block detail/update/remove | read / `blocks:manage` | block/updated/deleted |
| `GET, PATCH /api/owner/booking-settings` | booking/payment settings | read / `tenant:manage` | settings |
| `GET, PATCH /api/owner/operating-hours` | hours | read / `tenant:manage` | seven-day hours |
| `GET, POST /api/owner/pricing` | list/create rules | read / `pricing:manage` | rules/rule |
| `PATCH, DELETE /api/owner/pricing/{id}` | update/delete rule | `pricing:manage` | rule/deleted |
| `GET, PATCH /api/owner/turf-profile` | private profile / safe projection update | read / `tenant:manage` | profile |
| `GET /api/owner/reports` | bounded aggregate report | `reports:read` | revenue/count/method aggregates |
| `GET /api/owner/payment-claims` | pending Manual UPI review queue | `payments:manage` | `PAYMENT_PENDING` attempts |
| `POST /api/owner/payment-claims/{id}/approve` | approve claim | `payments:manage` | confirmed booking / idempotent existing |
| `POST /api/owner/payment-claims/{id}/reject` | reject claim/release lock | `payments:manage` | `REJECTED` |

### Webhook and internal

| Method/path | Purpose | Authentication / AC / RL | Scope and main result |
| --- | --- | --- | --- |
| `POST /api/webhooks/cashfree` | payment event | Cashfree signature; no AC; provider retry policy, event dedupe | order-derived tenant; paid/failed/duplicate/finalized |
| `POST /api/webhooks/cashfree-refunds` | refund event | Cashfree signature; no AC; provider retry policy, event dedupe | refund-derived tenant; pending/success/failed/duplicate |
| `POST /api/internal/expire-holds` | global expired-hold cleanup | cron bearer; no AC; 6/min | all tenants; checked/result list |
| `POST /api/internal/reconcile-payments` | reconcile unsettled orders | cron bearer; no AC; 6/min | order-derived tenants; paid/retry/attention outcomes |
| `POST /api/internal/reconcile-refunds` | reconcile refunds | cron bearer; no AC; 6/min | refund-derived tenants; pending/success/failed outcomes |

All APIs return `{ success, data, error, requestId }`. Stable implemented error codes are `UNAUTHENTICATED`, `FORBIDDEN`, `INVALID_APP_CHECK`, `TENANT_NOT_FOUND`, `TENANT_SUSPENDED`, `TURF_NOT_FOUND`, `BOOKING_DISABLED`, `INVALID_TIME_RANGE`, `SLOT_CONFLICT`, `HOLD_EXPIRED`, `PAYMENT_PENDING`, `PAYMENT_FAILED`, `PAYMENT_MISMATCH`, `BOOKING_NOT_FOUND`, cancellation/refund codes, `RATE_LIMITED`, `CONFIGURATION_ERROR`, `VALIDATION_ERROR`, and `INTERNAL_ERROR`. Payment `REJECTED` and `REQUIRES_ATTENTION` are resource states, not error codes. Browser fetch failure becomes `NETWORK_ERROR`. Unknown server/provider exceptions are logged server-side and returned as generic `INTERNAL_ERROR`; raw Firebase/Cashfree exceptions are not returned to customers.

## O-Q. Emulator, tests, and deployment

Credential-free workflow: install dependencies, install Playwright Chromium, run `pnpm test`, `pnpm test:rules`, `pnpm test:storage-rules`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Rules suites start only their required emulator. E2E starts Auth/Firestore/Storage emulators and Next on `127.0.0.1:3100`, with isolated `.next-e2e`; port 3000 is unaffected. Seed/create-owner scripts refuse production without explicit confirmation.

Deployment gate: use separate staging and production projects; populate secret-manager environment values; deploy Firestore indexes then rules and default-deny Storage rules; configure Auth providers/authorized domains and App Check; deploy HTTPS app; expose signed webhook URLs; schedule three protected internal jobs; verify logs/alerts/backups/retention; perform rollback and smoke tests. Keep data mode local until the real Firebase stage is intentionally enabled.

## R. Next-stage credential-dependent verification checklist

**Firebase:** project ID; web-app configuration; Admin credentials or supported workload identity; Firestore database/deployment; all indexes ready; Firestore and Storage rules deployed; Firebase Authentication and owner accounts configured; authorized domains; reCAPTCHA Enterprise App Check registration, monitor telemetry, then enforcement; production environment values; tenant seed and membership validation.

**Cashfree:** sandbox client ID/secret; sandbox account readiness; Hosted Checkout; HTTPS payment webhook URL; HTTPS refund webhook URL; return URL/domain; successful, failed, and abandoned payments; signed webhook; duplicate webhook; Get Order reconciliation; cancellation/refund; signed refund callback and Get Refund reconciliation.

**Manual UPI:** generic Android UPI intent; GPay; PhonePe; another installed UPI app; exact amount and UPI ID; reference/note; browser return behavior; WhatsApp deep link; owner realtime queue, approval, rejection, lock reopening, and real-world manual-refund procedure.

**Deployment:** production domain and HTTPS; all public/server environment values; cron schedules and bearer secret; external webhook reachability; Firebase authorized/App Check domains; monitoring and final production smoke tests.

## S. Known limitations

- Live Firebase, identity, deployed indexes/rules, App Check tokens, Cashfree sandbox/production, public webhook delivery, cron execution, and actual UPI apps remain unverified without external credentials/infrastructure.
- Rate limits use Firestore and deliberately fail open only for low-risk public turf/availability reads.
- Firebase Storage is unavailable by design.
- Manual UPI proof is an owner-reviewed claim; the app cannot independently verify the bank transfer or automate its refund.
- E2E uses Chromium, Firebase emulators, and a mocked Cashfree provider; cross-browser/device/provider behavior needs the next stage.
