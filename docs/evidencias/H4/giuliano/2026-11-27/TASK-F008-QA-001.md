# TASK-F008-QA-001 — filtros de catálogo: evidencia funcional

Fecha: 2026-11-27 (UTC). Issue #32 permanece abierta.

## Corte y dependencias

- Worktree aislado, rama `qa/giuliano-f008-ui-20261127`, basado al cerrar en Frontend `ce72b5d73e422dae77f56c4e6edb04983377dc31` (árbol `53faf27d42a11e891ad17c01ec85df1b09bce9cb`). El checkout principal no se modificó.
- El SHA de despliegue reportado para la UI era `1f02acc128b0eb4dc200c6519811b41ee6b551c1`; no se confirmó el SHA Vercel que sirvió durante esta tarea. `origin/main` avanzó a `ce72b5d`; la comparación con el corte informado cambia `.github/CODEOWNERS`, `.github/workflows/cicd.yml` y `.releaserc.json`. Los archivos de filtros y sus pruebas no cambiaron entre ambos cortes.
- Preflight GitHub: Frontend #32 `open` / origen `Pendiente`; FE #31 `open` / `Pendiente`; Backend #52 `closed`; Backend #53 `open` / `Bloqueado`. No se editaron esas issues ni sus dependencias. #53 sigue bloqueando aceptación integrada.

## Resultados por fuente

| Criterio | Fuente y evidencia | Resultado |
| --- | --- | --- |
| Aplicar filtros combinados, conservar búsqueda/orden, resetear página, limpiar y cancelar el borrador móvil | MOCK local documentado previamente: matriz H5 consolidada registra 24 PASS, 0 FAIL, 0 BLOCKED y 1 INCONCLUSIVE; el INCONCLUSIVE es de F-009, no de F-008. La matriz incluye rangos PEN y combinación. No se repitió la suite en este avance. | **PASS (MOCK histórico)** |
| Comportamiento del cliente para rango invertido y estados de error/recuperación | Los casos existentes en `tests/catalog-h4.spec.ts` comprueban que un rango inválido no solicita productos, aplicación combinada de marca/precio, conservación de URL, cancelación y restauración del borrador móvil. Código y pruebas se inspeccionaron; no se ejecutaron otra vez. | **PASS (cobertura existente; ejecución histórica)** |
| Filtro actual `q=G6 QA Marketplace Desempate`, `minPrice=40`, `maxPrice=50`, página 0, tamaño 2 | Una lectura GET al BFF Render, `2026-11-27T16:02:46Z`: HTTP 503 `CATALOG_UNAVAILABLE`, `X-Catalog-Source: REAL`, `X-Request-Id: bee19da7-cbe6-474d-bf5c-5fe7e4b860fb`. No se devolvieron productos ni precios. No hubo reintento. | **BLOCKED (BFF REAL)** |
| Aplicación del rango 40–50 desde los controles de la UI publicada | Se inició una sola navegación Playwright a `https://g1-marketplace-frontend.vercel.app/catalogo`. La herramienta siguió pendiente por más de 31 s; se detuvo y no devolvió status HTTP, encabezados, snapshot ni solicitudes. No se alcanzaron controles, por lo que no se envió el filtro desde UI. | **BLOCKED (herramienta sin respuesta)** |

Para la lectura REAL, el resultado esperado era el producto ID `8ad24563-c9da-4305-b650-1dd47a14fffb` (`G6 QA Marketplace Desempate`, S/49.90), porque el ID `93f7f500-077d-432e-be98-31cb9ee0d66d` cuesta S/39.90. La respuesta 503 impidió comprobarlo. No se llamó G6 directamente.

## Contexto previo, separado de esta prueba

- El comentario anterior de #32 registra en Render HTTP 200/REAL el 26/11 para rangos 0–100 (2 productos), 0–60 (2) y 0–45 (1). Ese retest fue con deploy Backend `dep-dc4b7u3l550s738o8jd0`, SHA `f17896d7ee24876ffd33db1bb7dd91d65623ed37`; no cubre 40–50 ni acredita el corte actual. [Comentario #32](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/32#issuecomment-7210658448)
- El comentario de #34 informa ocho solicitudes de catálogo en Vercel con HTTP 503 en otra lectura, y observaciones separadas de Render/BFF. No establece causa ni el SHA Vercel actual. [Comentario #34](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/34#issuecomment-7221131044)
- La navegación de #32 del 27/11 que quedó sin respuesta tras unos 42 s y la navegación descrita aquí son dos intentos distintos; ninguno permite concluir que el sitio esté caído. La evidencia histórica móvil que abrió URLs preparadas tampoco prueba interacción con los controles.

## Comandos y límites

- `git fetch origin main` y `git reset --hard origin/main` se ejecutaron sólo en el worktree aislado antes de crear este documento.
- Lectura única: `curl --silent --show-error --max-time 20 --connect-timeout 5 --max-redirs 0 --retry 0 --include 'https://g1-marketplace-backend.onrender.com/api/v1/catalog/products?q=G6%20QA%20Marketplace%20Desempate&minPrice=40&maxPrice=50&page=0&pageSize=2'`.
- No se ejecutaron tests en este avance: las suites existentes y la matriz MOCK previa ya cubren los casos locales indicados; se evitó una corrida redundante. No se hicieron más GET a Render, navegación adicional a Vercel ni llamadas directas a G6.

La evidencia permite conservar los resultados locales MOCK previos, pero la observación actual del filtro REAL quedó bloqueada por HTTP 503 y la comprobación mediante controles de UI quedó bloqueada por falta de respuesta de Playwright. FE #31 sigue Pendiente y BE #53 sigue Bloqueada; por ello no se acredita aceptación integrada ni se cierra #32. No se atribuye causa al 503 ni se afirma aceptación humana.
