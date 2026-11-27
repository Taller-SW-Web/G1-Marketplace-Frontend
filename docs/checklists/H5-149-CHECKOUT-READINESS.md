# H5-149 — checkout V-011–V-014 readiness

**Estado: implementación y verificación local completadas; aceptación/integración REAL pendiente.** Se conserva la dirección visual ya aprobada en #141; no se vuelve a solicitar una aprobación visual general. Los documentos detallados V-011–V-014/DS-001 no están incluidos en este worktree, por lo que estas capturas no se presentan como certificación de cada criterio de aceptación.

## Trabajo local

- Progreso accesible con Dirección, Resumen, Pago y Confirmación; el paso en curso lleva `aria-current="step"` y los anteriores se marcan como completos.
- Resumen responsivo y visible durante pago simulado/creación de orden: lateral en desktop y antes del formulario en móvil.
- Encabezado y explicación contextual por paso, controles responsivos y datos MOCK/fixture identificados.
- El formulario de contacto conserva errores inline y añade resumen enlazado, foco tras envío inválido y relaciones accesibles campo/error.
- La confirmación enfoca su título y diferencia explícitamente resultado de fixture de estado verificado por Backend.

## Evidencia y pruebas locales

Hay ocho capturas en [`docs/evidencias/H5/V-011-014-checkout/`](../evidencias/H5/V-011-014-checkout/README.md): desktop/móvil de V-011 resumen, V-012 consentimiento de pago simulado, V-013 formulario de creación de orden y V-014 confirmación fixture. Fueron tomadas con build de producción local y datos de fixture. Un doble HTTP de catálogo en loopback devolvió sólo una fixture vacía para impedir el 503 del proxy de catálogo; no se llamó al backend de negocio. La V-014 es `PED-MOCK-*`, sin pedido real ni cobro.

| Validación | Resultado | Clasificación |
|---|---:|---|
| `npm run typecheck` | PASS | local |
| `npm run test:components -- --run tests/components/checkout-flow.test.tsx` | 4/4 PASS | unit/componentes locales; fixtures |
| `npm run build` | PASS | build local |
| Capturas V-011–V-014, desktop/móvil | 8/8 | evidencia visual local/fixture, no aceptación REAL |

## Límites pendientes

- No hay integración Checkout→Ventas demostrada: los datos persistidos no contienen todavía la identidad/precio por línea, desglose y dirección requeridos por M1; la clave idempotente no tiene lookup GET en el contrato fijado. El provider G5 local sigue aislado.
- Los screenshots muestran el flujo de fixture, no persistencia real, cobro, estado autoritativo `PAGADO`, ni consulta REAL de `/checkout/confirmado/[orderId]`.
- Los estados de error/reintento de la consulta profunda, aprobación formal de las capturas y criterios detallados que no están versionados en este árbol siguen fuera de esta evidencia. No inventar esos criterios ni volver a pedir aprobación visual general.

Esta checklist no autoriza despliegue, credenciales, sandbox o llamadas a APIs de negocio. La clasificación de toda captura es LOCAL/FIXTURE.
