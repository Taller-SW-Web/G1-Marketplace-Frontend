# Evidencia QA local — Checkout F-022–F-027 (Frontend)

**Corte revisado:** `develop` en `1f02acc128b0eb4dc200c6519811b41ee6b551c1` (27-nov-2026).
**Modo:** pruebas unitarias/componentes y E2E con fixtures o dobles; ningún proveedor externo real.

Esta evidencia complementa las implementaciones fusionadas en [PR #108](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/108) y [PR #109](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/109). No cierra los gates INT ni acredita despliegue, grants, titularidad de direcciones o pago real.

## Matriz de pruebas

| Función | Casos FE verificados localmente | Evidencia principal |
|---|---|---|
| **F-022** Dirección | El POST envía solo campos de dirección, sin identidad del comprador; errores 400 conservan campos; 401 limpia la selección; una dirección vacía abre el formulario solo tras respuesta válida; cambiar dirección invalida la cotización. | `tests/components/checkout-api.test.ts`; `tests/components/checkout-address-benefits.test.tsx` |
| **F-023** Resumen | 503 no se interpreta como envío gratis; carrito cambiado y cotización vencida bloquean continuar; no se reutiliza una respuesta de contexto anterior. | `tests/components/checkout-address-benefits.test.tsx` |
| **F-024** Cupón/promoción | 422 conserva el resumen; la respuesta parcial del beneficio no recalcula importes base; retirar el beneficio obtiene una cotización base nueva; una respuesta tardía no reemplaza la vigente. | `tests/components/checkout-api.test.ts`; `tests/components/checkout-address-benefits.test.tsx` |
| **F-025** Preparación simulada | No se prepara sin consentimiento; envíos rápidos duplicados producen una sola preparación; `PREPARED`/`202` no se muestra como pedido pagado; cambios de cotización usan una nueva clave de preparación. | `tests/components/checkout-flow.test.tsx`; `tests/components/checkout-payment-confirmation.test.tsx`; `tests/components/checkout-recovery.test.tsx` |
| **F-026** Crear orden | El contacto no se persiste en almacenamiento del navegador; errores 400 permiten corregir y reintentar con la misma clave; tras timeout se verifica la operación antes de recuperar el POST y se conserva la misma clave idempotente. | `tests/components/checkout-payment-confirmation.test.tsx`; `tests/components/checkout-recovery.test.tsx` |
| **F-027** Confirmación | `SUBMITTED` no confirma pago; solo `SUCCEEDED + PAGADO` con datos autoritativos se considera pagado; un ID de orden que no coincide no revela datos; un deep link sin operación no consulta; existe fallback manual si falla copiar. | `tests/components/checkout-api.test.ts`; `tests/components/checkout-payment-confirmation.test.tsx`; `tests/components/checkout-recovery.test.tsx` |

## Validación ejecutada

Validación local reproducida sobre el corte anterior; resultados de esta sesión:

- `npm run typecheck` — aprobado.
- `npm run test:components` — **54 archivos y 480 pruebas aprobadas**.
- `npm run test:server` — **12 archivos y 139 pruebas aprobadas**.
- `npx playwright test --config playwright.checkout.config.ts` — **3 aprobadas; 1 omitida** (smoke opcional del Backend MOCK).
- `npm run lint` — aprobado.
- `git status --short` antes de documentar — árbol limpio; el corte revisado no contenía cambios sin confirmar.

La cobertura de F-025 se localiza en `tests/components/checkout-flow.test.tsx`, `checkout-payment-confirmation.test.tsx` y `checkout-recovery.test.tsx`; el E2E cubre consentimiento y etiqueta claramente el resultado fixture. Estos resultados son de mocks/fixtures y no constituyen evidencia de integración con un proveedor real ni de despliegue.

La dependencia transversal OPS #200 figura cerrada con evidencia de configuración y despliegue FE/BFF; esto habilita la base operativa, pero no sustituye la evidencia funcional REAL de F-025.

## Smoke de Backend MOCK

El smoke opt-in de `tests/checkout.spec.ts` requiere un Backend local desechable en `127.0.0.1:10000`, el emisor de identidad mock en `127.0.0.1:4010` y las variables `CHECKOUT_MODE=backend-mock` y `NEXT_PUBLIC_CHECKOUT_MODE=backend-mock`. Se ejecutó con PostgreSQL temporal en Docker (puerto 55432, almacenamiento temporal) y las migraciones del backend local. En el primer intento, el guard CSP detectó imágenes sintéticas de `https://placehold.co` bloqueadas. Se corrigió la configuración E2E para añadir ese hostname exacto solo al servidor local cuando se selecciona `backend-mock`; la CSP de producción y su lista de hosts no cambiaron. Reejecución: `npx playwright test --config playwright.checkout.config.ts -g "backend-mock quotes"` — **1 aprobada**; verifica añadir al carrito, versión persistida, creación de cotización y cantidad/SKU. No se llamó a servicios externos de checkout ni al BFF de producción. Los procesos y la base de datos temporales se detuvieron y eliminaron al finalizar.

## Límites

- Los fixtures/dobles no prueban la integración REAL con G2, G5, G6 o G7 ni la concesión de grants.
- `PREPARED`, `SUBMITTED` y el resultado `PAGADO` usado por fixtures no representan una compra o pago real.
- El contrato FE no expone un resultado de notificación por correo; no se infiere ni se valida aquí que un fallo de correo altere el estado de la orden.
- Referencias de seguimiento: issues FE/QA #59–#70; esta evidencia no las cierra automáticamente.
