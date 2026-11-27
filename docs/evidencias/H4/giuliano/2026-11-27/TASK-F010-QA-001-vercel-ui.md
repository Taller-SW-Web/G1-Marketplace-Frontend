# TASK-F010-QA-001 — retest de paginación en Vercel

**Resultado: PARCIAL; no está lista para aceptación.** La paginación entre las dos páginas conocidas y el reset al cambiar la búsqueda funcionaron en la UI. La respuesta fuera de rango fue vacía y controlada, pero el estado visual no cumple V-006-OPEN-03. La issue #36 permanece abierta.

## Alcance y corte

- **Captura UTC:** `2026-11-27T20:48:43.029Z`; duración total de la corrida: 15.482 s. No hubo `pageErrors`.
- **URL inicial:** [Catálogo Vercel](https://g1-marketplace-frontend.vercel.app/catalogo?q=G6%20QA%20Marketplace%20Desempate&pageSize=1), búsqueda `G6 QA Marketplace Desempate`, `pageSize=1`.
- **SHA:** GitHub `main` fue consultado antes de la corrida y apuntaba a [`ce72b5d73e422dae77f56c4e6edb04983377dc31`](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/commit/ce72b5d73e422dae77f56c4e6edb04983377dc31). Andrés comunicó ese mismo SHA como el de Vercel; esta pasada no confirmó la metadata del runtime.
- **Método:** Chrome local con Playwright. Navegación y acciones sobre la UI; se capturaron sólo solicitudes de catálogo generadas por la página. Sin llamadas directas al BFF/API.

## Recorrido de UI y solicitudes

Cada escenario generó una sola solicitud de productos; no se repitieron requests. Las cuatro devolvieron HTTP 200, `X-Catalog-Source: REAL`, `Cache-Control: no-store`.

| Escenario | URL/estado | Resultado de la UI/API | Request ID |
|---|---|---|---|
| Primera página | `q=G6 QA Marketplace Desempate`, `pageSize=1`, page omitido (`pageNumber=0`) | Página 1 de 2; `ord-002`, ID `8ad24563-c9da-4305-b650-1dd47a14fffb`; total 2, 2 páginas | `d9704cc2-c67a-4b4d-9a9a-44addc820095` |
| Siguiente (también última, porque hay 2 páginas) | URL agrega `page=1`; `pageNumber=1` | Página 2 de 2; `ord-001`, ID `93f7f500-077d-432e-be98-31cb9ee0d66d`; total 2, 2 páginas; IDs únicos entre las páginas | `fa4f26ca-0160-444d-9072-f196792b7ffe` |
| Cambiar búsqueda desde la página 2 | Se envió `G6 QA Marketplace`; URL quitó `page`, conservó `pageSize=1` | Volvió a page 0 / página 1 de 2 y mostró `ord-002` | `f36c6ad9-9c15-4979-a273-544ef8648576` |
| URL fuera de rango | `q=G6 QA Marketplace Desempate&page=2&pageSize=1` | API: `pageNumber=2`, size 1, total 2, 2 páginas, `products=[]` | `80670cf8-e9e6-4e62-a489-d8647840fdb7` |

La UI no mostró un control separado «Última»: una pulsación de «Siguiente» desde page 0 llegó a la última página. El botón «Siguiente» se ve deshabilitado en la página 2 de 2. El DOM no tenía controles de filtro; el único input era el buscador. Por tanto, el reset de búsqueda se verificó y el reset de filtros no.

## Caso fuera de rango y OPEN-03

Para `page=2&pageSize=1`, la respuesta originada por la UI fue HTTP 200/REAL, vacía, con totales válidos. La pantalla presentó «ESTA PÁGINA YA NO TIENE PRODUCTOS» y **«Página 3 de 2»**, con «Anterior» habilitado y «Siguiente» deshabilitado. También mostró «Limpiar búsqueda» y «Ver catálogo completo». Ninguna era una acción explícita para volver a page 0 conservando `q`; no se pulsaron. No hubo redirección automática ni retry.

Según la decisión de [V-006-OPEN-03](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/blob/main/SPECS/ui/vistas/V-006-catalogo-resultados.md), el vacío de API pasó, pero la UI de este corte **no cumple** la acción explícita para volver a la primera página conservando los criterios. La paginación normal y el reset por búsqueda sí quedaron observados.

El retest separado de Backend #61 reportado en dependencias también tuvo `data=[]`, page 2, size 1, total 2 y HTTP 200/REAL (request `297754b6-b1f4-4786-8505-bf7031aec24b`). No es una respuesta de esta UI ni se volvió a ejecutar aquí. La evidencia Backend #61 no sustituye la comprobación visual de FE #36. FE #35 conserva su aceptación independiente; BE #60 está cerrado.

## Capturas y JSON sanitizado

- [Página 1](./page-0.png) — SHA-256 `bf889b286ef9edc6c097b1b344af952739a2443e11e62c76a9c8bc678e9cf935`
- [Página 2](./page-1.png) — SHA-256 `67f911a8e476a1b7d7424f07d214fba82c9842580c8ab6ffbc3223e1c8a4efbe`
- [Búsqueda reiniciada a página 1](./search-reset.png) — SHA-256 `54af3f9ef8d5507b76375945ab3731a3f892af87ef508723e24504e358f79ff1`
- [Página fuera de rango](./page-2-out-of-range.png) — SHA-256 `3f428b7a8717633c4deee4b33293adbd28333e347d85095dd8f93a82f6ed9656`
- [JSON con requests, respuestas y tiempos](./TASK-F010-QA-001-vercel-ui.json)

La evidencia no demuestra snapshot global entre solicitudes; registra únicamente los productos efectivamente recibidos en las páginas 0 y 1 del recorrido. No se cambió el estado de la issue.
