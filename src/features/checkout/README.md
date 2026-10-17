# Checkout adapters

The checkout uses local fixtures by default. Set `NEXT_PUBLIC_CHECKOUT_MODE=backend-mock` and `CHECKOUT_MODE=backend-mock` to opt into the server-side proxy for local integration. Both the Cart and Checkout BFFs obtain the same `default` mock identity server-side; tokens are never forwarded to the browser. The proxies only accept loopback HTTP services and are disabled in production.

Set `MARKETPLACE_API_URL` and `MOCK_AUTH_URL` to the local Backend and mock-auth loopback endpoints. On entering Checkout and again before quoting, the UI reads `/api/cart/current` and uses the persisted cart's lines and version; it never trusts a fixture version, URL parameter, or browser storage. Empty/unavailable carts stay visible as errors and are not converted into fixture success.

Cart quantity/removal controls remain local-only until the Backend exposes mutation endpoints; Checkout uses the Backend snapshot as authority. Local-fixture `PAGADO` is labeled as fixture-only. Backend confirmation follows F-027's nested response and requires `state=SUCCEEDED` with `order.state=PAGADO` for the requested order ID. In MOCK mode, pending orders are recovered through the persisted order idempotency key; no order ID is stored on a `SUBMITTED` operation.

## Validation

This repository currently has no GitHub Actions workflows, so pull requests may show no automated checks. Run the local checks with `npm run lint`, `npm run typecheck`, `npm run test:components`, and `npm run test:checkout:e2e`. The last command builds the app and runs Checkout fixture E2E tests; Backend MOCK smoke tests require the local services described above.
