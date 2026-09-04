# TurfMate backend architecture

TurfMate remains one Next.js application. React pages keep the approved presentation layer; trusted route handlers call domain services, which depend on repository and payment-provider contracts. Firebase Admin is isolated in server-only modules. Firebase client code is used only for owner authentication and optional authenticated reads.

## Request flow

Public slug → safe `publicTurfs/{slug}` projection → tenant/turf booking context → server validation and price calculation → Firestore transaction creates hold and deterministic slot locks → local payment order → Cashfree Hosted Checkout → signed webhook or Get Order reconciliation → idempotent booking finalization.

Owner token → Firebase Admin verification → active membership lookup → secure session cookie → central permission check → tenant-scoped operation.

## Collection map

| Collection | Purpose | Client access |
|---|---|---|
| `users/{uid}` | Tenant membership index | Own user read |
| `tenants/{tenantId}` | Tenant record | Active member read |
| `tenants/{tenantId}/members` | Roles and status | Active member read |
| `turfs`, `bookings`, `holds`, `slotLocks`, `blocks` | Tenant operations | Active member read; Admin writes |
| `pricingRules`, `operatingHours`, `settings` | Booking configuration | Active member read; Admin writes |
| `auditLogs` | Immutable operational audit trail | Active member read; Admin writes |
| `publicTurfs/{slug}` | Safe public projection | Public read only |
| `paymentOrders`, `bookingLocators`, `refunds`, `webhookEvents`, `rateLimits` | Global server locators, lifecycle state, dedupe claims, and limiter buckets | No client access |

Timestamps represent UTC instants; each tenant stores an IANA timezone. The repository/service boundary can move to Cloud Run or Functions without rewriting booking rules.
