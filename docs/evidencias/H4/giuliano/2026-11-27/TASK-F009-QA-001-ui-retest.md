# TASK-F009-QA-001 — retest de orden en UI publicada

Fecha: 2026-11-27 (UTC). Issue #34 permanece abierta.

## Estado y dependencias

- Preflight GitHub: FE #34 `open` / origen `Pendiente`; FE #33 `open` / `Pendiente`; BE #56 `closed`. #33 conserva pendiente de aceptación independiente y dependencia OPS. No se modificaron estados ni labels.
- El retest REAL de BE #57 está documentado por separado en [commit `2c5cbf3`](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/commit/2c5cbf36b403cd50e7d6a38e23196fd65a5fb164): las cuatro combinaciones API de orden/página dieron 200/REAL. Eso no acredita que la UI publicada haya cargado o aplicado los controles.

## Código inspeccionado

Worktree basado en Frontend `origin/main` `ce72b5d73e422dae77f56c4e6edb04983377dc31` (árbol `53faf27d42a11e891ad17c01ec85df1b09bce9cb`). Inspeccioné `/catalogo`, `SearchBox`, `CatalogSortSelect`, `Catalog` y `ProductCard` en ese corte:

- La caja de búsqueda normaliza espacios y navega a `/catalogo?q=...` al enviar.
- El selector visible `Ordenar por` ofrece `NAME_ASC` y `NAME_DESC`; cambiarlo actualiza criterios y vuelve a cargar el catálogo.
- La tarjeta enlaza usando el slug. Las pruebas de catálogo existentes incluyen casos MOCK para búsqueda y sort; no se ejecutaron en este avance.

Este SHA es el código fuente inspeccionado, no un SHA Vercel confirmado. Los estados combinados de GitHub consultados para `ce72b5d` y el corte previo `1f02acc128b0eb4dc200c6519811b41ee6b551c1` no reportaron checks; no encontré una fuente confiable que identifique el deployment servido. No adjudico `ce72b5d`, `1f02acc` ni otro SHA a la UI actual.

## Intento único de UI

Se inició una sola carga en un contexto aislado del navegador a:

```text
https://g1-marketplace-frontend.vercel.app/catalogo
```

La llamada de Playwright continuaba como `Script running` a los 11 s y seguía pendiente a los 16 s; se canceló esa misma llamada. La herramienta no devolvió documento, status HTTP, encabezados, snapshot, lista de requests, captura ni error. No llegué a los controles para ingresar la búsqueda o cambiar `NAME_ASC`/`NAME_DESC`.

| Criterio de este retest | Resultado |
| --- | --- |
| Inspección del flujo de búsqueda/orden en el código del corte actual de `origin/main` | **INSPECTED (estático, no es resultado funcional)** |
| Carga y uso de controles en Vercel | **BLOCKED (browser sin respuesta)** |
| Orden visible, IDs/slugs, paginación, status/request ID/source del request browser | **NOT OBSERVED** |
| SHA servido por Vercel | **UNKNOWN** |

No se puede concluir si la página respondió o si el sitio/DNS está caído: no hubo resultado observable del navegador. Tampoco se declara fallo de producto. No se usó una lectura API directa, no se reintentó navegación, no se hicieron cambios de código y no se leyeron secretos.

## Procedimiento

- Worktree aislado: `/tmp/G1-Marketplace-Frontend-f009-qa-20261127`, rama `qa/giuliano-f009-ui-controls-20261127`, desde `origin/main` `ce72b5d73e422dae77f56c4e6edb04983377dc31`. El checkout principal con cambios del usuario quedó intacto.
- Único intento: `browser_tabs(action="new", isolatedContext="f009-qa-20261127", url="https://g1-marketplace-frontend.vercel.app/catalogo")`; continuó pendiente por más de 16 s y se canceló.
- No se ejecutaron suites locales en este avance. No se hicieron llamadas directas a G6 ni lecturas/escrituras de secretos/configuración de entorno.

#34 permanece `open` / `Pendiente`. FE #33 continúa `open` / `Pendiente` y BE #56 `closed`; aceptación independiente y dependencia OPS siguen pendientes para #33.
