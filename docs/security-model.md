# Security model

Firestore and Storage deny by default. Anonymous clients can read only whitelisted `publicTurfs` fields. Active Firebase users can read only their tenant tree; all authoritative client writes are denied. Global locators, payment orders, refunds, webhook claims, and limiter buckets are server-only.

Every owner API verifies the secure Firebase session cookie, active tenant membership, and central permission map. Client-provided tenant IDs are never authorization. Customer lookup verifies booking ID plus a server-HMACed normalized phone and returns a short-lived scoped token. Payment status uses a separately scoped token.

Public APIs support App Check `disabled`, `monitor`, and `enforce` modes. App Check supplements rather than replaces authentication, authorization, schemas, origin/CSRF checks, and rate limits. Production rate limits use transactional Firestore buckets with SHA-256 keys; phone numbers are never included raw. Availability and public turf reads fail open if the limiter is unavailable, while mutations, authentication, status, cancellation, and reconciliation fail closed. `429` responses include `Retry-After`.

Timestamps are canonicalized to UTC ISO strings at API boundaries before range queries or deterministic lock IDs are created. Secrets, tokens, cookies, webhook signatures, card data, and UPI credentials must not be logged or exposed through `NEXT_PUBLIC_` variables.
