# H5-149 — capturas locales V-011–V-014

Estas ocho capturas documentan el recorrido visual local del Checkout con la dirección visual aprobada previamente. **No son evidencia de integración ni capturas de aceptación REAL.**

| Vista | Desktop (1440 px) | Móvil (390 px nominales) |
|---|---|---|
| V-011 · Resumen/envío | [desktop](desktop-v011-resumen-fixture.png) | [móvil](mobile-v011-resumen-fixture.png) |
| V-012 · Pago simulado | [desktop](desktop-v012-pago-simulado-fixture.png) | [móvil](mobile-v012-pago-simulado-fixture.png) |
| V-013 · Creación de orden | [desktop](desktop-v013-creacion-orden-fixture.png) | [móvil](mobile-v013-creacion-orden-fixture.png) |
| V-014 · Confirmación | [desktop](desktop-v014-confirmacion-fixture.png) | [móvil](mobile-v014-confirmacion-fixture.png) |

## Condiciones de captura

- Se usó el build local de producción (`npm run build` / `next start`) y el navegador Orca; no se usó la capa DevTools de Next.
- Para evitar el 503 del proxy de catálogo por falta de BFF, `MARKETPLACE_API_URL` apuntó únicamente a un doble HTTP efímero en `127.0.0.1:11009`, que respondió una fixture vacía sólo para `GET /api/v1/catalog/home`. No se alcanzó ningún servicio de negocio, sandbox ni entorno compartido.
- Checkout usa los datos de prueba locales `SKU-MOCK-001/002`, cotización de demostración y confirmación fixture `PED-MOCK-*`. La confirmación declara que no llamó al Backend y que no hubo cobro. Los datos del formulario usados para llegar a ella eran sintéticos.
- V-011–V-013 son estados de fixture/UI; V-014 es confirmación de fixture, no una orden pagada/verificada por Ventas.
- El viewport móvil nominal fue 390×844. En la emulación, `innerWidth` y `documentElement.scrollWidth` coincidieron; no se observó desbordamiento horizontal.

Reproducir las capturas no autoriza a configurar un proveedor real, realizar cobros, ni sustituye pruebas de accesibilidad automatizadas o revisión de aceptación.
