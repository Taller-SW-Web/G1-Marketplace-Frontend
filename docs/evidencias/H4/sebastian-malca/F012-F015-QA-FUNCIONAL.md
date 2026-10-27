# Evidencia H4 — QA funcional F-012…F-015 (Frontend, MOCK)

**Autor:** Sebastian Malca
**Revisor:** Giuliano Macchiavello (`@GiulianoMaPe`)
**Rama:** `feat/h4-f012-f015-detalle-comercial`
**PR:** #107 · **Backend:** #232
**Fecha:** 2026-10-26
**Entorno:** Windows 11, Node v24.15.0, npm 11.12.1, `happy-dom` 21.0.4, Chromium (Playwright), BFF NestJS local en modo MOCK.

> **Etiqueta de datos:** todas las pruebas se ejecutaron con **MOCK**
> (`CATALOG_SOURCE=mock`, fixtures locales). No acreditan datos REALES ni
> sustituyen `TASK-F0xx-INT-001` (bloqueadas por I-01).

## Casos ejecutados

Comandos:

```
npm run typecheck
npm run lint
npm run test:components
npm run test:server
npm run build
npx playwright test tests/product-commerce.e2e.spec.ts tests/product-detail.e2e.spec.ts
```

Resultados: `typecheck` OK · `lint` OK (1 warning preexistente en `OrdersHistory.tsx`) ·
`test:components` 227/227 · `test:server` 73/73 · `build` OK ·
Playwright 10/10 (34.4 s).

### F-012 — precio, oferta y descuento (issue #40)

| Caso | Regla | Nivel | Resultado |
|---|---|---|---|
| Precio derivado de importes autoritativos; descuento 15 % | CA-F012-01/02 | componente/servicio | ✅ |
| Sin oferta no se inventa 0 % | RC-F-012-02 | componente + E2E (`demo 2`) | ✅ |
| Oferta caducada retira badge, referencia y descuento juntos | RC-F-012-03 | unidad (`normalizePrice`) | ✅ |
| Sin SKU no se consulta ni se hereda precio ajeno | RC-F-012-01 | componente + E2E (`variable`) | ✅ |
| Error de precio no oculta descripción/especificaciones | RC-F-012-04 | componente | ✅ |
| Errores 409/422/502/503/504 tipados | contrato | servicio | ✅ |
| Transiciones `waiting_for_variant → loading → regular/sale → unavailable` | estados | componente | ✅ |

### F-013 — selección de atributos y variante (issue #42)

| Caso | Regla | Nivel | Resultado |
|---|---|---|---|
| Combinación inválida elimina el SKU previo | RC-F-013-01 | unidad (`pruneSelection`) + componente | ✅ |
| Variante agotada sigue siendo seleccionable | RC-F-013-02 | componente | ✅ |
| Producto simple no renderiza selector | RC-F-013-03 | componente + E2E (`demo`) | ✅ |
| Cambio de combinación consulta precio/stock del SKU nuevo | RC-F-013-04 | componente + E2E (`variable`) | ✅ |
| SKU ausente/duplicado o combinación repetida → 502 | contrato | servicio | ✅ |
| Teclado/foco/`aria-pressed`/`aria-describedby`/resumen `aria-live` | accesibilidad | componente | ✅ |

### F-014 — disponibilidad (issue #44)

| Caso | Regla | Nivel | Resultado |
|---|---|---|---|
| 503 de inventario no se presenta como agotado | RC-F-014-01 | componente + servicio | ✅ |
| Sin SKU no hay consulta ni estado ficticio | RC-F-014-02 | componente | ✅ |
| Respuesta del SKU anterior se descarta | RC-F-014-03 | componente (clave `slug:sku:intento`) | ✅ |
| No se renderizan cantidades ni ubicaciones | RC-F-014-04 | componente + E2E | ✅ |
| Tres estados por SKU (`VAR-1`/`VAR-2`/`VAR-3`, demo 3, demo 5) | contrato | servicio + E2E | ✅ |
| Estado no homologado (`INDETERMINADO`) rechazado como 502 | G-G6-COMPAT (pendiente) | servicio | ✅ (defensivo) |

### F-015 — productos relacionados (issue #46)

| Caso | Regla | Nivel | Resultado |
|---|---|---|---|
| Vacío omite título y sección | RC-F-015-01 | componente | ✅ |
| Fallo técnico degrada a `[]` sin afectar la ficha | RC-F-015-02 | componente + servicio | ✅ |
| `price: null` no se convierte en 0 | RC-F-015-03 | componente | ✅ |
| Cada tarjeta navega a `/productos/{slug}` sin SKU | RC-F-015-04 | componente + E2E | ✅ |
| Orden del BFF, máximo 8, sin producto origen ni duplicados | contrato | servicio | ✅ |

## Hallazgos y retest

| # | Hallazgo | Tipo | Acción | Estado |
|---|---|---|---|---|
| 1 | El gate `sca-all` del CI falló por aviso **alto** en `happy-dom@21.0.1` (CVE-2026-33943, dependencia de desarrollo, corrección disponible no major) | herramienta/seguridad | Actualizado a `happy-dom@21.0.4`; `npm audit` → 0 vulnerabilidades; 227/227 componentes y `typecheck` OK | ✅ corregido y reprobado |
| 2 | La prueba E2E de F-011 asumía que la ficha no mostraba precio/stock; con F-012…F-015 esa expectativa quedó obsoleta | prueba | Actualizada para exigir precio, oferta, disponibilidad y relacionados | ✅ reprobado |
| 3 | `fetchProductAvailability` requiere el argumento `sku` explícito en pruebas | tipado | Ajustada la llamada a `undefined` | ✅ reprobado |

No se encontraron defectos funcionales abiertos en el alcance cubierto.

## Límites de esta evidencia

- Pruebas **MOCK**: no sustituyen la validación con proveedores reales.
- `npm run test:e2e` completo no forma parte del workflow de CI del repo; aquí se ejecutaron los dos specs afectados contra el backend local.
- Las pruebas de integración real (`TASK-F0xx-INT-001`) siguen bloqueadas por **I-01**.
- La descarga de foco/lectores de pantalla se validó de forma automatizada, no con prueba manual asistida.
