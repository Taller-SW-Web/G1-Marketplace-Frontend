# Checkout adapters

The checkout uses local fixtures by default. Set `NEXT_PUBLIC_CHECKOUT_MODE=backend-mock` and `CHECKOUT_MODE=backend-mock` to opt into the server-side proxy for local integration. Both the Cart and Checkout BFFs obtain the same `default` mock identity server-side; tokens are never forwarded to the browser. The proxies only accept loopback HTTP services and are disabled in production.

Set `MARKETPLACE_API_URL` and `MOCK_AUTH_URL` to the local Backend and mock-auth loopback endpoints. On entering Checkout and again before quoting, the UI reads `/api/cart/current` and uses the persisted cart's lines and version; it never trusts a fixture version, URL parameter, or browser storage. Empty/unavailable carts stay visible as errors and are not converted into fixture success.

Cart quantity/removal controls remain local-only until the Backend exposes mutation endpoints; Checkout uses the Backend snapshot as authority. Local-fixture `PAGADO` is labeled as fixture-only. Backend confirmation follows F-027's nested response and requires `state=SUCCEEDED` with `order.state=PAGADO` for the requested order ID. In MOCK mode, pending orders are recovered through the persisted order idempotency key; no order ID is stored on a `SUBMITTED` operation.

## Validation

This repository currently has no GitHub Actions workflows, so pull requests may show no automated checks. Run the local checks with `npm run lint`, `npm run typecheck`, `npm run test:components`, and `npm run test:checkout:e2e`. The last command builds the app and runs Checkout fixture E2E tests; Backend MOCK smoke tests require the local services described above.


## Modo `bff` (checkout conectado al BFF real)

Con `NEXT_PUBLIC_CHECKOUT_MODE=bff` (compilación) y `CHECKOUT_MODE=bff` (servidor), el flujo deja de usar fixtures y `/api/checkout/*` reenvía al BFF (`MARKETPLACE_API_URL`) con la sesión opaca de la cuenta (`__Host-g1_session` o `g1_session`), `cart_session`, `Idempotency-Key` y el `Origin` de `G1_WEB_ORIGIN`. Requiere `G1_AUTH_ENABLED=true` y una sesión iniciada. No acepta tokens del navegador.

- Direcciones: lista y alta contra G7 por el BFF (REAL).
- Cotización, preparación y pedido: dependen de la configuración del BFF (`CHECKOUT_SALES_SOURCE`, fixture de homologación). Un pedido creado desde la pantalla es un pedido real en Ventas; el pago lo simula Ventas.
- Un 202, 409 o 429 del BFF no se interpreta como pagado: la pantalla ofrece verificar la operación original.
- Sin estas variables el modo por defecto sigue siendo `local-fixtures`.
