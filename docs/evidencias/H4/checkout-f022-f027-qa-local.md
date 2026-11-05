# Evidencia QA local — Checkout F-022–F-027 (Frontend)

**Corte base:** `develop` en `6d4491f1d0e34162af9bcaca24a5a5988fd45d89` (5-nov-2026).
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

En la rama `test/checkout-qa-evidence-f022-f027`:

- `npm run typecheck` — aprobado.
- `npm run test:components` — **34 archivos y 309 pruebas aprobadas**. La salida incluyó registros `ECONNREFUSED`, pero no hubo fallos en la suite.
- `npm run test:checkout:e2e` — **3 aprobadas; 1 omitida** (smoke opcional del Backend MOCK).
- `npm run lint` — aprobado.
- `git diff --check` — aprobado.
- Pruebas dirigidas de `checkout-api.test.ts` y `checkout-recovery.test.tsx` — **30 aprobadas**.

## Límites

- Los fixtures/dobles no prueban la integración REAL con G2, G5, G6 o G7 ni la concesión de grants.
- `PREPARED`, `SUBMITTED` y el resultado `PAGADO` usado por fixtures no representan una compra o pago real.
- El contrato FE no expone un resultado de notificación por correo; no se infiere ni se valida aquí que un fallo de correo altere el estado de la orden.
- Referencias de seguimiento: issues FE/QA #59–#70; esta evidencia no las cierra automáticamente.
