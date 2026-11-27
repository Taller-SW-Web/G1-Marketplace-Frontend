# TASK-F008-QA-001 — retest REAL de búsqueda y precio

Fecha: 2026-11-27 (UTC). #32 permanece `open` / `Pendiente`.

## Estado y dependencias

- Preflight GitHub: FE #32 `open` / `Pendiente`; FE #31 `open` / `Pendiente`; BE #52 `closed`. No se modificaron estados ni labels.
- FE #31 ya está integrada, pero conserva pendiente la aceptación independiente. No se trabajó BE #53.

## Adaptador y corte live

- En Frontend `origin/main` `ce72b5d73e422dae77f56c4e6edb04983377dc31` (árbol `53faf27d42a11e891ad17c01ec85df1b09bce9cb`) inspeccioné `criteria.ts`, `SearchBox`, `CatalogFilters` y el proxy BFF. La búsqueda usa `q`; `URLSearchParams` codifica espacios como `+`. El rango usa `minPrice`/`maxPrice`; la paginación usa `page`/`pageSize`. El proxy conserva la query string hacia el backend.
- Render `list_deploys`, consultado antes del GET, mostró `g1-marketplace-backend` live en deploy `dep-dc4q1ue0tbcc73der13g`, SHA `ab4ffca8ce20eabd3b3f716289b8df1d16ae7c7f`. El intento más reciente `bcac2f6b279954c43bfa067a773c6629c6bbc502` terminó `update_failed`; no se atribuye ese estado al resultado del GET.
- El SHA `ce72b5d` es el código FE inspeccionado; no es una afirmación del SHA servido por Vercel. No se consultó el browser ni se ejecutaron suites.

## Una lectura al BFF

Hice exactamente un GET de solo lectura al BFF Render con la codificación que produce el adaptador:

```text
https://g1-marketplace-backend.onrender.com/api/v1/catalog/products?q=G6+QA+Marketplace+Desempate&minPrice=40&maxPrice=50&page=0&pageSize=2
```

Respuesta a `2026-11-27T16:47:30Z`: HTTP 503, `code=CATALOG_TIMEOUT`, `X-Catalog-Source: REAL`, `X-Request-Id: b8591908-de44-4431-8241-08c148ca813f`. El cuerpo no trae productos, precio ni total. El `X-Request-Id` identifica al BFF; no se expuso versión/universo ni `correlationId` de G6.

Con los datos G6 proporcionados, se esperaba sólo el producto 002 (`8ad24563-c9da-4305-b650-1dd47a14fffb`, S/49.90); el 001 (`93f7f500-077d-432e-be98-31cb9ee0d66d`, S/39.90) queda fuera del rango. Esta respuesta no permite verificar el resultado esperado. No se repitió el GET ni se atribuye causa al timeout.

| Criterio de este retest | Resultado |
| --- | --- |
| Nombres y codificación de parámetros en el adaptador | **INSPECTED** |
| Búsqueda y rango 40–50 en BFF REAL | **BLOCKED (HTTP 503 `CATALOG_TIMEOUT`)** |
| Producto, precio y total devueltos | **NOT OBSERVED** |
| Versión/universo/correlationId G6 | **NOT EXPOSED** |

## Evidencia relacionada y límites

- El sondeo anterior de #32, 16:02:46Z, está documentado en [commit `62d264a`](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/commit/62d264ae8e2dc35dc5ec2322ea16f1e273f24f81); respondió 503 `CATALOG_UNAVAILABLE`. Es una respuesta anterior y distinta de este `CATALOG_TIMEOUT`.
- [Backend #49, commit `bafb418`](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/commit/bafb418721c77ae85c77363f9104f3beddf3f433) y [Backend #57, commit `2c5cbf3`](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/commit/2c5cbf36b403cd50e7d6a38e23196fd65a5fb164) contienen evidencia REAL relacionada de búsqueda/desempate y páginas; no se repitieron aquí sus requests.
- Esta lectura no valida interacción UI ni aceptación independiente. No se llamó G6 directamente, no se leyeron secretos, no se reintentó la petición y no se ejecutaron pruebas locales.

#32 permanece `open` / `Pendiente`; FE #31 sigue `open` / `Pendiente` y BE #52 `closed`. No se cambió el estado ni DoD.
