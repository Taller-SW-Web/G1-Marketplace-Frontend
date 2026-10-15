# Evidencia H3 — Sebastian Malca — TASK-F011-FE-001 (MOCK)

**Fecha:** 2026-10-15
**Repositorio / rama / commit:** `G1-Marketplace-Frontend` / `main` (local) / *commit pendiente*
**Specs leídas:** F-011 v0.1.0 · V-007 v0.1.0 · O-002 v0.1.0
**Frame Figma:** (enlace confirmado por PO — pendiente)
**Etiqueta:** **MOCK** (I-01 sin cerrar; el corte NO integra datos REAL)

> **Desviación de rama:** el checklist define `feat/h3-f011-ficha-parcial` desde `develop`. Se acordó con el usuario trabajar en `main` local; crear rama, push o PR se consulta antes de ejecutarlo (PASO 13 pendiente).

---

## Trabajo manual realizado

- Definición de la máquina de estados F-011 (`loading | ready | not_available | error`) y su mapeo a códigos HTTP del contrato API-F011-001.
- Implementación de la feature `src/features/catalog/` (types, fixtures, services, hooks, components) y ruta `src/app/productos/[slug]/page.tsx`.
- Extensión del proxy compartido `src/app/api/catalog/[...path]/route.ts` para `products/{slug}` con validación de slug.
- Bloque CSS F-011 añadido al final de `src/app/globals.css` (galería, visor, estados, responsive).
- Revisión visual de los 5 estados en navegador (desktop 1280×900 y mobile 390×844) y del ciclo de foco del visor.

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
| `npm run test:components` | ✅ **32/32** |
| `npm run build` | ✅ `ƒ /productos/[slug]` |
| `npm run test` (components + e2e) | ⚠️ e2e requiere BFF Marketplace en `127.0.0.1:10000` (no disponible en este entorno) |

- RC-F-011-01: PASS (Anterior deshabilitado en la 1.ª; Siguiente deshabilitado en la última)
- RC-F-011-02: PASS (imagen fallida → respaldo "Imagen no disponible", h1 y descripción visibles)
- RC-F-011-03: PASS (`not_available` neutral, sin "inactivo"/"privado", enlace a `/catalogo`)
- RC-F-011-04: PASS (Escape cierra y restaura el foco — verificado también en navegador)
- RC-F-011-05: PASS (descripción con `<script>` no se inyecta ni se ejecuta)
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
- Además, en este entorno no hay BFF Marketplace (`127.0.0.1:10000`), por lo que `npm run test:e2e` no puede ejecutarse: los specs E2E existentes dependen de él.

**Revisor:** Giuliano Macchiavello — **PR:** [pendiente de consulta antes de crear]
