# Checkout adapters

The checkout uses local fixtures by default. Set `NEXT_PUBLIC_CHECKOUT_MODE=backend-mock` and `CHECKOUT_MODE=backend-mock` to opt into the server-side proxy for local integration. The proxy only accepts loopback HTTP services and is disabled in production; it mints the mock bearer token server-side and never forwards it to the browser.

Set `MARKETPLACE_API_URL` and `MOCK_AUTH_URL` to the local Backend and mock-auth loopback endpoints. `NEXT_PUBLIC_CHECKOUT_CART_VERSION` must match an active, versioned cart for the mock identity. The Backend has no checkout endpoint to provision that cart, so `CART_NOT_FOUND`/`CART_CHANGED` are surfaced as errors and are not converted into fixture success.

The Backend mock integration cannot be considered end-to-end verified until a suitable active cart is provisioned. Local-fixture `PAGADO` is labeled as fixture-only. Backend confirmation requires an authoritative operation response with `state=SUCCEEDED` and `orderState=PAGADO`.
