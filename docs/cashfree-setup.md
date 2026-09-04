# Cashfree setup

TurfMate uses Cashfree Hosted Web Checkout. Configure server-only `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`, set `CASHFREE_ENV=sandbox`, `CASHFREE_API_VERSION=2026-01-01`, public mode `NEXT_PUBLIC_CASHFREE_MODE=sandbox`, and `PAYMENT_PROVIDER=cashfree`.

Whitelist the HTTPS application domain in Cashfree. The return URL is `{APP_URL}/t/{slug}/payment?order_id={order_id}` and the webhook URL is `{APP_URL}/api/webhooks/cashfree`. Subscribe to payment success, failure, and user-dropped events. The endpoint verifies the timestamp plus raw request body using HMAC-SHA256 before parsing it. Browser redirects never mark a booking paid; the status endpoint calls Get Order and checks amount/currency.

The payment webhook is `/api/webhooks/cashfree`; the signed refund webhook is `/api/webhooks/cashfree-refunds`. Sandbox verification must cover successful, failed, dropped, delayed, and duplicate events; overlapping-slot rejection; return-before-webhook and webhook-before-return; refund pending/success/failure; and Get Refund reconciliation. Then rotate to production credentials, change both Cashfree modes, retain HTTPS, and repeat a low-value smoke test.

`PAYMENT_SETTLEMENT_MODE=PLATFORM` means customer funds settle to TurfMate’s merchant account. Direct owner settlement requires commercially approved Cashfree vendor onboarding/Easy Split; metadata is not a substitute.

References: [Hosted checkout](https://www.cashfree.com/docs/payments/online/web/redirect), [Create Order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order), and [webhook signatures](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification).
