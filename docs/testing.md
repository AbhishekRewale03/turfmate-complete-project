# Testing

- `pnpm test` — all Vitest unit, domain, API contract, payment, and refund tests; emulator-only rules suites are skipped here.
- `pnpm test:unit` — domain, booking, concurrency, limiter, and App Check tests.
- `pnpm test:payments` — mocked Cashfree payment contracts.
- `pnpm exec vitest run tests/refunds` — cancellation/refund contracts.
- `pnpm test:integration` — API boundary contracts.
- `pnpm test:rules` — Firestore emulator tenant-isolation/default-deny rules.
- `pnpm test:storage-rules` — Storage emulator default-deny rules.
- `pnpm test:e2e` — 31 serial Playwright scenarios using Auth, Firestore, and Storage emulators plus mocked Cashfree. Next runs on port 3100 with `.next-e2e`.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` — static and production-build gates.

Rules tests require Java; Playwright requires Chromium (`pnpm exec playwright install chromium`). Live Cashfree tests are intentionally excluded until sandbox credentials and a reachable HTTPS webhook exist. Never put real credentials in automated local tests.

## Last credential-free verification — 4 September 2026

- Unit/domain/API/payment/refund: 8 files, 51 tests passed.
- Firestore rules: 1 file, 4 tests passed.
- Storage rules: 1 file, 2 tests passed.
- Playwright emulator E2E: 31 tests passed.
- TypeScript: passed with no errors.
- ESLint: passed with no errors or warnings.
- Next.js production build: passed; 64 route entries discovered (34 API route files, 29 page files, and the generated not-found route).
- Client bundle scan: no server-secret names, private-key markers, or E2E payment secret found.

Total automated tests/scenarios reported by these gates: 88 passed.
