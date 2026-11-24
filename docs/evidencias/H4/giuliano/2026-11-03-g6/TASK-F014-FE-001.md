# TASK-F014-FE-001 — disponibilidad por confirmar

[Issue #43](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/43). Base: `feat/h4-f012-f015-detalle-comercial` (`9892459fb2405927ddef165cf86d167aac1892c9`).

El tipo y adaptador públicos aceptan `UNDETERMINED`. AvailabilityRegion muestra “Disponibilidad por confirmar”, icono `?`, anuncio polite y botón “Volver a consultar”. No lo presenta como error o agotado.

ProductCommerce no transforma ese estado en `UNAVAILABLE`: omite el CTA de compra mientras ofrece reconsulta en la región de disponibilidad. La guardia permite sólo los cuatro campos públicos y rechaza respuesta de un SKU diferente al solicitado. Un 503 continúa como error técnico.

## Validación local

- `npm run test:components`: 240 casos PASS en esta rama; 31 focalizados en comercio/cuarto estado.
- `npm run test:server`: 73 casos PASS.
- `npm run build` y `npm run typecheck`: PASS.
- `npm run lint`: sin errores, con el warning previo de dependencias de useEffect en OrdersHistory.
- `npx playwright test tests/product-commerce.e2e.spec.ts --reporter=line`: cinco casos PASS con Edge headless y Next → BFF MOCK.
- Controles existentes de secretos/SAST/SCA: PASS; runtime sin vulnerabilidades. Once avisos moderados de desarrollo pendientes de revisión de riesgo.

No se añade un fallback API→mock ni se activa el adaptador REAL de disponibilidad.

## Límites y revisión

Este aporte de Giuliano continúa las ramas de Sebastián; no modifica asignación ni revisor de la issue. Se mantiene separado de las entregas F-006–F-010. No se afirma aprobación humana, identidad G7, integración REAL ni despliegue. No se ejecutaron reservas, consumo de cupón ni operaciones contra servicios remotos.

La issue conserva su DoD y permanece abierta. Faltan revisión independiente del nuevo corte, integración autorizada y comprobación del SHA desplegado. IA: Codex para implementación, pruebas y registro; revisión humana pendiente.
