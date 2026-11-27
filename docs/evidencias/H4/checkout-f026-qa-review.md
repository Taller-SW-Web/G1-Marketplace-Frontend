# F-026 — paquete de revisión FE/QA

**Corte:** 27-nov-2026. **Clasificación:** implementación integrada; validación local con fixtures/dobles; integración desplegada reportada por separado. Esta página no declara cerrado el DoD de F-026.

## Implementación y trazabilidad

| Alcance | Evidencia integrada |
|---|---|
| Formulario y estado de creación | `src/features/checkout/CheckoutComponents.tsx`: `OrderCreationForm` y `OrderSubmissionStatus`; errores de contacto enfocados y estados `READY`/`UNCERTAIN`/`REJECTED`. |
| Solicitud BFF e idempotencia | `src/features/checkout/api.ts` manda `Idempotency-Key` por el Route Handler; `CheckoutFlow.tsx` conserva operación/contacto/clave mientras el resultado es incierto. |
| Verificar antes de recuperar | En modo `bff`, GET de la operación es de solo lectura. El reenvío ocurre únicamente con acción explícita, conservando operación, contacto y clave. |
| Revisión de errores/timeout | [PR #131](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/131) cubre no reintentar a ciegas y conservar la clave; [PR #181](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/181) integra el modo BFF opt-in; [PR #183](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/183) añade recuperación explícita. Las tres están mergeadas. |

## Validación observada

- **LAB LOCAL**, worktree `pr183-recovery-reset`, SHA probado `3b6a6a66a1e92aaf18c5229121476b5cd47add85`:
  - `npx vitest run tests/components/checkout-flow.test.tsx tests/components/checkout-recovery.test.tsx tests/components/checkout-api.test.ts tests/server/checkout-api-retry-after.test.ts tests/server/checkout-bff-route.test.ts` → 3 archivos / 36 pruebas aprobadas. Vitest ejecutó los tres archivos de componentes seleccionados; los dos paths de servidor no formaron parte de esos 36 resultados.
  - `npm run typecheck` → PASS.
- CI de [PR #183](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/183): `Lint, Typecheck y Unitarias`, `Build, Compile y Test`, `e2e-cart-checkout` y `web` → PASS; versionado y Docker omitidos como corresponde a una PR.
- Las pruebas usan mocks/fixtures. No se envió compra ni se probó un pedido real desde la UI en este corte.

## Criterios y límites para revisión

- Doble envío, timeout, consulta de operación y recuperación explícita están cubiertos en las suites enlazadas; el reintento no genera otra clave ni se activa automáticamente.
- El contacto se mantiene en estado de la UI para la operación y no se persiste en almacenamiento del navegador según la cobertura de #131.
- La UI no debe presentar `SUBMITTED` como pago confirmado; el éxito requiere los campos autoritativos y `PAGADO`.
- La compra REAL de G1 registrada en Backend es evidencia **reportada**, no una reproducción FE: las cotizaciones/revalidaciones de esa compra fueron MOCK. No acredita E2E de F-026 desde el navegador.
- Pendiente: revisión independiente de FE #67/#68; el smoke/deploy BFF REAL de la UI queda **NOT_RUN** en este corte. No marcar las issues como cerradas por el merge de las PRs.

Refs FE #67, #68; Backend #131, #133, #134, #135.
