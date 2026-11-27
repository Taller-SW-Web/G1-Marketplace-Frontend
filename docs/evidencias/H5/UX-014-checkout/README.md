# QA de estados de checkout · FE #154

Chrome 158 local sobre la base de Frontend `bcbdf55`. Escritorio a 1280 × 900 y móvil a 390 × 844. Pasaron cuatro pruebas de fixtures y dos de recuperación. Las capturas usan datos sintéticos y el proveedor de la verificación se simula con respuestas interceptadas.

| Escenario | Escritorio | Móvil |
| --- | --- | --- |
| V-011 · Resumen y cupón aplicado | [Captura](./desktop-v011-resumen.png) | [Captura](./mobile-v011-resumen.png) |
| V-012 · Pago simulado, consentimiento requerido | [Captura](./desktop-v012-pago-simulado.png) | [Captura](./mobile-v012-pago-simulado.png) |
| V-013 · Confirmación antes de crear pedido | [Captura](./desktop-v013-creacion-orden.png) | [Captura](./mobile-v013-creacion-orden.png) |
| V-014 · Pago etiquetado como fixture | [Captura](./desktop-v014-confirmado-fixture.png) | [Captura](./mobile-v014-confirmado-fixture.png) |
| V-014 · Respuesta 202, pedido por confirmar | [Captura](./desktop-v014-verificacion-pendiente.png) | [Captura](./mobile-v014-verificacion-pendiente.png) |
| V-014 · Error 503 y opción de reintento | [Captura](./desktop-v014-error-recuperable.png) | [Captura](./mobile-v014-error-recuperable.png) |
| V-014 · Respuesta 200, pedido confirmado | [Captura](./desktop-v014-confirmado-tras-reintento.png) | [Captura](./mobile-v014-confirmado-tras-reintento.png) |

## Reproducción

Después de instalar las dependencias y el navegador Edge que usa la configuración del repositorio, ejecutar:

```bash
npm run test:checkout:e2e -- -g 'checkout local fixtures|address form|address and quote'
NEXT_PUBLIC_CHECKOUT_MODE=backend-mock npm run test:checkout:e2e -- -g 'checkout verification recovers'
```

La verificación simulada ejecuta tres etapas de lectura: `202 SUBMITTED/CREADO`, `503 SALES_UNAVAILABLE` y `200 SUCCEEDED/PAGADO`. Las pruebas comprueban que solo se consulta por GET, que el estado pagado aparece después de la respuesta final y que el error permite reintentar. Una vez confirmado el pago, la interfaz retira el aviso del intento anterior.

La prueba documenta los estados locales de V-011 a V-014. La validación del checkout con proveedores desplegados sigue en las tareas de integración.
