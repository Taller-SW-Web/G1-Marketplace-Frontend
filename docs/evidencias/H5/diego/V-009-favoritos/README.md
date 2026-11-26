# Evidencia Visual — `FE #151` (`TASK-H5-UX-011`: Favoritos `V-009` con `DS-001`)

- **Issue:** [FE #151](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/151)
- **Responsable:** `@DiesmEsp` · **Revisor:** `@saire22`
- **Alineación visual (`DS-001` / `TASK-H5-UX-001`):**
  - Tokens de superficie, texto, bordes, acciones, estados (`--surface-cloud`, `--surface-subtle`, `--text-primary`, `--text-secondary`, `--action-primary`, `--action-hover`, `--action-strong`, `--success-strong`, `--warning-strong`, `--error-strong`, `--border`, `--radius-*`, `--spacing-*`) y tipografía `Oswald` en encabezados de `.favorites-surface`.
  - Estado visual diferenciado (`favorites-stock--pending` con `--warning-strong`) para productos con disponibilidad **por confirmar** (`undetermined`).
  - Preservados todos los estados: **listo**, **cargando**, **vacío**, **error** y **por confirmar / agotado / retirado**.

## Verificación automatizada
- `npm run lint` (`eslint .`): **PASS** (`0` errores)
- `npm run typecheck` (`tsc --noEmit`): **PASS** (`0` errores)
- `npm run test:components` (`vitest run`): **PASS** (`50/50` archivos, `465/465` tests)
- `npm run test:server` (`vitest run --config vitest.server.config.mts`): **PASS** (`10/10` archivos, `124/124` tests)
- `npm run test:e2e:favorites:ui` (`playwright.favorites-ui.config.ts`): **PASS** (`10/10` tests)

## Capturas Desktop (`1440×900`) y Móvil (`390×844`)

| Estado | Desktop (`1440×900`) | Móvil (`390×844`) |
|---|---|---|
| Lista lista (con acciones y tarjetas `DS-001`) | [desktop-01-lista.png](desktop-01-lista.png) | [mobile-01-lista.png](mobile-01-lista.png) |
| Cargando (barra de progreso y skeletons) | [desktop-02-cargando.png](desktop-02-cargando.png) | [mobile-02-cargando.png](mobile-02-cargando.png) |
| Vacío (con CTA a catálogo) | [desktop-03-vacio.png](desktop-03-vacio.png) | [mobile-03-vacio.png](mobile-03-vacio.png) |
| Error de consulta (con reintento) | [desktop-04-error.png](desktop-04-error.png) | [mobile-04-error.png](mobile-04-error.png) |
| Sin existencias | [desktop-05-agotados.png](desktop-05-agotados.png) | [mobile-05-agotados.png](mobile-05-agotados.png) |
| Disponibilidad por confirmar con «Agregar al carrito» deshabilitado | [desktop-06-por-confirmar.png](desktop-06-por-confirmar.png) | [mobile-06-por-confirmar.png](mobile-06-por-confirmar.png) |

Las capturas de disponibilidad por confirmar se tomaron en `/favoritos` con una respuesta de prueba de la API de favoritos (`UNDETERMINED`). Playwright verificó el texto y el botón deshabilitado en ambos tamaños.
