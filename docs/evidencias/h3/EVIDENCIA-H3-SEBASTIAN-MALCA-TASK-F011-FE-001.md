# Evidencia H3 — Sebastian Malca — TASK-F011-FE-001 (MOCK)

**Fecha:** 2026-10-15 · **Consumo de `returnTo` (handoff):** 2026-10-16 · **Cierre de feedback del revisor:** 2026-10-17
**Repositorio / rama / commit:** `G1-Marketplace-Frontend` / `feat/h3-f011-f015-detalle-de-producto` / `134ba4b`
**PR:** [#7 → develop](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/7) · revisor solicitado: Giuliano MaPe · **aprobación pendiente**
**CI:** [H3 F-011 Frontend — run 39004640813 ✅](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/actions/runs/39004640813) (lint · typecheck · 75 tests · build)
**Specs leídas:** F-011 v0.1.0 · V-007 v0.1.0 · O-002 v0.1.0
**Frame Figma:** (enlace confirmado por PO — pendiente)
**Etiqueta:** **MOCK** (I-01 sin cerrar; el corte NO integra datos REAL)

> **Desviación de rama:** el checklist prescribía `feat/h3-f011-ficha-parcial` desde `develop`. Rama real creada y subida: **`feat/h3-f011-f015-detalle-de-producto`** (hito + rango del bloque F-011–F-015 + módulo), **desde `main`** porque el repo no tenía `develop`; hoy el PR #7 apunta a `develop` (creado tras la reorganización del repo).

---

## Trabajo manual realizado

- Definición de la máquina de estados F-011 (`loading | ready | not_available | error`) y su mapeo a códigos HTTP del contrato API-F011-001.
- Implementación de la feature `src/features/catalog/` (types, fixtures, services, hooks, components) y ruta `src/app/productos/[slug]/page.tsx`.
- Extensión del proxy compartido `src/app/api/catalog/[...path]/route.ts` para `products/{slug}` con validación de slug.
- Bloque CSS F-011 añadido al final de `src/app/globals.css` (galería, visor, estados, responsive).
- **Consumo del handoff `returnTo`** (ELEMENTOS-COMPARTIDOS §4, "validador InternalPath"): nuevo `src/features/catalog/returnTo.ts` (`sanitizeReturnTo` sólo acepta rutas internas — prefijo `/` único, sin `//`/`\` ni chars de control, ≤512 — resto cae a `/catalogo`); `page.tsx` lee `searchParams` y lo pasa al contenedor, que lo usa en los enlaces "Volver al catálogo" (rutas internas válidas) y en la migra "Catálogo" (sólo criterios `/catalogo?…`, ver V-007 "Migas → Catálogo: criterios previos cuando existan; si no, catálogo general").
- Revisión visual de los 5 estados en navegador (desktop 1280×900 y mobile 390×844) y del ciclo de foco del visor.
- **Cierre del feedback del revisor (2026-10-17):**
  1. **Cada tarjeta abre la ficha correspondiente + inexistente → 404:** el modo MOCK ahora **pasa por el BFF** — el adaptador dejó su fixture local y consulta siempre el proxy → BFF (`BFF_MODE=mock` vive allá; el BFF sirve las 32 fichas `producto-demostracion-N` espejo del listado); el aviso `[MOCK]` se deriva de `meta.source` de la respuesta (data-driven: reproducible en build limpio, sin `NEXT_PUBLIC_*`); **HTTP 404 real** con gate server-only en `page.tsx` (slug fuera de contrato o 404 del BFF → `notFound()`) + nuevo `not-found.tsx` de la ruta que conserva el estado neutral RC-F-011-03 («Producto no disponible» + «Volver al catálogo»).
  2. **Prueba Frontend → BFF MOCK reproducible:** `playwright.config.ts` arranca el **BFF NestJS** (`npm ci` + `build` del backend hermano, verificación por `/live`) y `next start` con `MARKETPLACE_API_URL` apuntando a él; `testIgnore` documentado para `catalog.spec.ts`/`figma-h3.spec.ts` (dependen de `GET /home` y `GET /products` del PR #11 F-006/F-007, aún sin fusionar — se reincorporan al fusionarlo); spec nueva `tests/product-detail.e2e.spec.ts` con **6 casos**: tarjeta → ficha con `returnTo`, aviso MOCK vía proxy, HTTP 404 (inexistente y slug especial) y errores acordados 503/504. Comando único: `npm run test:e2e`.
  3. **Coordinaciones:** conflictos de integración con el revisor (merge develop: `page.tsx` del carrito reemplazado por el de F-011, sin región comercial en H3) y acceso al avance de carrito con `@andreus710` — mensajes pendientes de publicar.

## Verificación contra specs (G1-Marketplace-SPECS)

Leídos y contrastados: `funcional/F-011` · `ui/F-011` · `contrato-api/F-011` · `componentes-react/F-011` · `ui/overlays/O-002` · `ui/vistas/V-007` (sistema `DS-001`).

- **Cumple:** ruta y árbol de componentes; máquina de estados `LOADING/READY/NOT_AVAILABLE/ERROR` + `MEDIA_FALLBACK`; contrato `API-F011-001` vía proxy a `/api/v1/catalog/products/{slug}`; mapeo `400/404/502/503/504`; slug `1–120` con patrón canónico; galería con controles finitos, `aria-pressed` y respaldos; visor O-002 con trampa de foco, `Escape`, restauración y `aria-live`; `h1` único; región comercial omitida (UI-V007-001); contenido sanitizado sin `dangerouslySetInnerHTML`.
- **Compartidos reutilizados:** `Button`, `LoadingState`/`Skeleton`, tokens `src/theme/tokens.css` (131 `var(--…)`, 0 hex literales en el bloque F-011), regla global `prefers-reduced-motion`.
- **Correcciones aplicadas tras la revisión:** (1) validación por ítem de `media` — sólo `IMAGE`/HTTPS/`alt`/`displayOrder` válidos, se descartan los inválidos y sin medios válidos → `502` (API-CA-F011-04); (2) textos exactos del spec: *"No pudimos cargar este producto"* y botón *"Volver al catálogo"*; (3) omisión de filas de especificaciones con nombre/valor vacío tras sanitizar (funcional §7); (4) reset de `viewerOpen`/`viewerIndex` al cambiar de slug (componentes-react §5).
- **Desviaciones pendientes conocidas:** sin acordeón de specs en móvil con >1 grupo; respaldo de `alt` depende del BFF; estados `error`/`not_available` con markup propio en lugar de `ErrorState` compartido; endpoint `/api/catalog/...` (proxy Next) en vez de `/api/v1/...` literal en el navegador.

## IA utilizada

- **OpenCode (agente) · propósito:** generar y verificar la implementación F-011 de H3 (tipos, servicios, hook, componentes, ruta, CSS, tests) a partir del checklist y los specs, corriendo `typecheck`/`lint`/`test`/`build` en cada iteración — *sin secretos ni credenciales en los prompts*.

## Código generado por IA — qué se revisó y corrigió manualmente

- **`useProductDetail.ts`** — se descartó el esquema `useReducer` + `retryCount.current` del checklist (incumple `react-hooks/exhaustive-deps` y la regla `react-hooks/set-state-in-effect`); se reescribió con `useState` + estado derivado `result.key === key`, conservando `AbortController` y `retry()`.
- **`product-detail.service.ts`** — se reemplazó `as ProductDetailResponseDTO` por una validación estructural (`productId`, `name`, `media.length`) para no usar `any` ni casts ciegos.
- **Endpoint** — el checklist escribe `/api/v1/catalog/products/{slug}`; se usa `/api/catalog/products/{slug}` reutilizando el proxy existente (nota de desviación en el PASO 12).
- **Codificación de `globals.css`** — el bloque CSS se añadió inicialmente con codificación ANSI (bytes UTF-8 inválidos) y Turbopack marcó el archivo como *unparsable*; se reparó byte a byte y se verificó `roundtrip UTF-8 == original`.
- **Tests** — adaptados a Vitest + RTL (no Jest): `vi.fn()` en vez de `jest.fn()`, matchers propios porque no hay `@testing-library/jest-dom`; fichero renombrado a `useProductDetail.test.tsx`.

---

## Pruebas ejecutadas

- Comandos:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 errores |
| `npm run lint` | ✅ 0 errores / 0 warnings |
| `npm run test:components` | ✅ **75/75** (9 suites; unitarios F-011 con stub de fetch espejo del contrato del BFF) |
| `npm run build` | ✅ `ƒ /productos/[slug]` |
| `npm run test:e2e` | ✅ **6/6** — reproducible: levanta el BFF NestJS en MOCK (`npm ci` + `build` + `/live`) y `next start` |
| `npm run test` | ✅ components + e2e (igual que los dos anteriores en serie) |

- RC-F-011-01: PASS (Anterior deshabilitado en la 1.ª; Siguiente deshabilitado en la última)
- RC-F-011-02: PASS (imagen fallida → respaldo "Imagen no disponible", h1 y descripción visibles)
- RC-F-011-03: PASS (`not_available` neutral, sin "inactivo"/"privado", enlace a `/catalogo`) — **además con HTTP 404 real** (e2e: `producto-demostracion-99` y `producto-no-existente-mock` responden `status 404` con ese estado)
- RC-F-011-04: PASS (Escape cierra y restaura el foco — verificado también en navegador)
- RC-F-011-05: PASS (descripción con `<script>` no se inyecta ni se ejecuta)
- Handoff `returnTo`: PASS — validador InternalPath (`tests/catalog/returnTo.test.tsx`, 12 tests): conserva `/catalogo?q=…`, rechaza externos (`https:`, `//`, `javascript:`), backslashes y chars de control; consumido en los enlaces "Volver al catálogo" y en la migra "Catálogo" — **verificado también en e2e**: la tarjeta navega a `/productos/producto-demostracion-5?returnTo=…` y la migra conserva `/catalogo?categoryIds=running`
- Tarjeta → ficha del producto correspondiente: PASS (e2e con listado interceptado: clic en tarjeta → ficha «Zapatillas de running 05» + aviso `[MOCK]`; en el BFF cada slug tiene su ficha propia)
- Errores acordados: PASS — `producto-error-503-mock` → estado de error con `Reintentar` + `data-error-code=PRODUCT_CATALOG_UNAVAILABLE`; `producto-error-504-mock` → `PRODUCT_CATALOG_TIMEOUT`
- Etiqueta: **MOCK**

### Verificación en navegador (Playwright, chromium)

| Estado | Desktop 1280×900 | Mobile 390×844 |
|---|---|---|
| `LOADING` (`aria-busy="true"`, esqueleto) | ✅ | ✅ |
| `READY` (1 solo `h1`, sin scroll horizontal) | ✅ | ✅ |
| `NOT_AVAILABLE` (sin causas internas) | ✅ | ✅ |
| `ERROR` (genérico + `Reintentar`) | ✅ | ✅ |
| Visor O-002: foco al abrir = "Cerrar visor" → `Escape` → foco restaurado en "Ampliar imagen", `role=dialog` cerrado | ✅ | ✅ |

---

## Capturas / log sanitizado

En [`docs/evidencias/h3/`](./):

| Archivo | Estado |
|---|---|
| `f011-loading-desktop.png` / `f011-loading-mobile.png` | LOADING |
| `f011-ready-desktop.png` / `f011-ready-mobile.png` | READY |
| `f011-not-available-desktop.png` / `f011-not-available-mobile.png` | NOT_AVAILABLE |
| `f011-error-desktop.png` / `f011-error-mobile.png` | ERROR |
| `f011-viewer-desktop.png` / `f011-viewer-mobile.png` | Visor O-002 abierto |

---

## Gates que bloquean integración REAL

- **I-01:** ruta/auth/payload de Productos y Ofertas sin homologar.
- Sin cierre de I-01 → `TASK-F011-INT-001` permanece **Bloqueado** (así consta en `plan/seguimiento/F-011-detalle-producto.md`).
- La prueba **Frontend → BFF MOCK** sí es reproducible sin I-01: `npm run test:e2e` levanta el BFF local en `BFF_MODE=mock` y el navegador sólo pasa por el proxy de Next — nunca llama a Productos y Ofertas.

**Revisor:** Giuliano Macchiavello — **PR:** [#7](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/7) (revisor solicitado vía API; **aprobación pendiente**)
