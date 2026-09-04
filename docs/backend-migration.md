# TurfMate backend migration audit

## Continuation re-audit: remaining local-data dependencies

Re-verified 4 September 2026. The migration checklist is complete in credential-free Firebase/emulator mode. Local files remain solely for the explicit demo adapter.

- [x] `stores/turfmate-store.ts` and `lib/data/local-repository.ts` are used only by explicit local demo pages.
- [x] Firebase-mode owner pages use `components/owner/firebase-owner-pages.tsx` and the typed API/listener boundary.
- [x] Owner dashboard, bookings, calendar, blocks, pricing, hours, profile, settings, reports, and logout await server-confirmed operations.
- [x] Firebase-mode customer turf, availability, details, payment, lookup, detail, cancellation, and refund states use server APIs.
- [x] Firebase drafts and scoped access/idempotency tokens use sessionStorage only; no authoritative business records are stored there.
- [x] Owner screens hydrate from server APIs and bounded, authenticated, tenant-scoped Firestore listeners.
- [x] Owner block/pricing/hours/profile/settings/report APIs are implemented.
- [x] Customer cancellation, persistent paid-refund lifecycle, signed webhook, and reconciliation APIs are implemented.
- [x] Distributed rate limiting, App Check modes, environment validation, realtime listeners, and 31 emulator-backed Playwright scenarios are implemented.
- [x] Firebase mode has explicit error states and never silently falls back to local data. The checked-in default remains `NEXT_PUBLIC_DATA_MODE=local`.

| Approved screen | Firebase/API operation |
| --- | --- |
| `/owner/dashboard` | Bounded dashboard snapshot plus today booking listener |
| `/owner/bookings`, `/owner/calendar` | Date-bounded bookings/blocks/holds queries and listener |
| `/owner/bookings/new`, detail | Manual create, get, patch, cancel, mark paid |
| `/owner/blocks/*` | Blocks CRUD with transactional slot locks |
| `/owner/settings/pricing` | Pricing CRUD and overlap validation |
| `/owner/settings/hours` | Hours read/update |
| `/owner/settings/profile` | Private turf update plus safe public projection transaction |
| `/owner/settings/booking` | Booking settings read/update |
| `/owner/reports` | Date-bounded server report calculation |
| `/t/[slug]` | Public projection plus availability response |
| `/details`, `/payment` | Client draft only; server hold, confirmed price, payment order |
| `/booked`, `/booking/[id]` | Protected lookup, scoped detail token, cancellation/refund |

## Baseline

Audited on 2026-09-03 before backend implementation. The existing application is Next.js 16.3.3 App Router, React 19, TypeScript 5.7, Tailwind CSS 4, Geist, Lucide React, and Vitest. Baseline `typecheck`, 16 unit tests, and the production build pass. There are no API routes, backend environment variables, Firebase packages, payment SDKs, deployment configuration, or server-side authentication modules.

## Existing UI routes and data consumers

| Route | Current data/operations |
| --- | --- |
| `/t/[turfSlug]` | Resolves a local tenant by public slug; reads turf, settings, hours, pricing, bookings, blocks, and holds; writes a booking draft. |
| `/t/[turfSlug]/details` | Reads/writes the tenant booking draft and customer fields. |
| `/t/[turfSlug]/payment` | Creates a local hold, simulates payment, creates a confirmed booking, and releases the hold. |
| `/t/[turfSlug]/success/[bookingId]` | Reads a tenant booking by route ID. |
| `/t/[turfSlug]/booked` | Compares booking ID and phone in browser state. |
| `/t/[turfSlug]/booking/[bookingId]` | Reads a locally verified booking and may cancel it. |
| `/owner/login` | Creates a mock owner session. |
| `/owner/onboarding` | Presentation-only setup wizard. |
| `/owner/dashboard` | Reads tenant bookings, settings, hours, and turf profile. |
| `/owner/bookings`, `/owner/bookings/[bookingId]`, `/owner/bookings/new` | Queries, creates, edits, cancels, and marks local tenant bookings paid. |
| `/owner/calendar` | Reads bookings, blocks, and active holds for one date. |
| `/owner/blocks`, `/owner/blocks/new`, `/owner/blocks/[blockId]/edit` | Reads and mutates local blocks. |
| `/owner/reports` | Calculates reports from tenant bookings. |
| `/owner/settings/*` | Reads and mutates pricing, hours, profile, booking settings, and demo state. |

The approved UI is concentrated in `components/customer/customer-pages.tsx`, `components/owner/owner-pages.tsx`, and `components/shared/ui.tsx`. App Router page files are thin route adapters. No visual components should be replaced during backend migration.

## Existing state and repository boundary

`stores/turfmate-store.ts` exposes `useTurfStore` through `useSyncExternalStore` and the `turfActions` command API. `lib/data/local-repository.ts` is the persistence implementation; it is not yet behind an explicit repository interface. Same-tab notifications use subscribers, while cross-tab notifications use `BroadcastChannel` and the browser `storage` event.

Current keys:

- `turfmate:v1:tenants`
- `turfmate:v1:tenant:[tenantId]`
- `turfmate:v1:owner-session`

Current local entities are `Tenant`, `Turf`, `Booking`, `BookingDraft`, `Hold`, `Block`, `PricingRule`, `OperatingHours`, and `BookingSettings`. All business records are tenant-scoped, but the browser remains authoritative and therefore is not a production security boundary.

Pure utilities already exist for timezone conversion, range conflicts, operating windows, slot generation, duration validation, segmented pricing, immutable pricing snapshots, and reports. These functions remain useful for UI previews; production decisions move to server services using strict schemas and Firestore transactions.

## Firestore replacement map

| Local entity | Firestore target |
| --- | --- |
| Tenant | `tenants/{tenantId}` |
| Owner/session | Firebase Auth, `users/{uid}`, `tenants/{tenantId}/members/{uid}`, secure session cookie |
| Turf | `tenants/{tenantId}/turfs/{turfId}` plus safe `publicTurfs/{slug}` projection |
| Booking | `tenants/{tenantId}/bookings/{bookingId}` plus server-only `bookingLocators/{bookingId}` |
| BookingDraft | Browser session state only; never authoritative |
| Hold | `tenants/{tenantId}/holds/{holdId}` |
| Availability occupancy | Deterministic `tenants/{tenantId}/slotLocks/{slotLockId}` documents |
| Block | `tenants/{tenantId}/blocks/{blockId}` plus slot locks |
| PricingRule | `tenants/{tenantId}/pricingRules/{pricingRuleId}` |
| OperatingHours | `tenants/{tenantId}/operatingHours/{weekday}` |
| BookingSettings | `tenants/{tenantId}/settings/booking` |
| Payment attempt | Server-only `paymentOrders/{merchantOrderId}` and tenant-safe payment summary |
| Mutations | `tenants/{tenantId}/auditLogs/{auditId}` |

## Trusted operations

Slug resolution returns only the public projection. Availability and pricing previews may run client-side, but hold creation, slot locking, price calculation, manual booking, block creation/removal, payment order creation, payment verification, booking finalization, cancellation, refunds, and reports become server-authoritative. Every owner mutation verifies the session, active tenant membership, membership status, role, and central permission. Customer lookup uses a server-only locator, normalized phone lookup hash, rate limiting, and a short-lived access token.

## UI behavior that must remain unchanged

The mobile shells, route URLs, typography, warm ivory/green palette, bottom navigation, forms, cards, timeline, loading skeletons, empty states, dialogs, toasts, cross-midnight labels, pricing breakdown, payment countdown, booking pass, and owner workflows are the presentation contract. Backend connection may add only network, authentication, permission, payment-verification, retry, and configuration states using the existing components.

## Migration gates

Local demo persistence remains active while backend services are developed and tested independently. Production mode must use Firebase/Cashfree repositories exclusively; it must never mix local and remote authoritative records. Frontend switching happens only after unit, rules, emulator integration, concurrency, and mocked payment tests pass. Live Cashfree sandbox checkout, signed webhook delivery, and refund verification remain credential-dependent and must be reported separately.
