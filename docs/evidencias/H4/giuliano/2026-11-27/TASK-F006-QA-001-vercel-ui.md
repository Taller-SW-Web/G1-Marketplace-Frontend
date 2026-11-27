# FE #28 — retest visual REAL en Vercel

**Captura:** 2026-11-27T20:15:43.242Z (UTC).
**Issue:** [TASK-F006-QA-001 — inicio, categorías y destacados](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/28).
**Entorno:** [Home de Vercel](https://g1-marketplace-frontend.vercel.app/).

## Resultado observado

Chrome abrió la portada publicada en 4.57 s y mostró el título **Inka Athletics**, diez categorías y la sección **DESTACADOS PARA TI** con la tarjeta **G6 QA Marketplace Desempate** (`g6-qa-marketplace-ord-001`, `93f7f500-077d-432e-be98-31cb9ee0d66d`). El navegador reportó cero errores de página. La captura se incluye como [`vercel-home.png`](./vercel-home.png); SHA-256: `3d554e7ca4a0bd4073af15dc245bbbc0b011fd76a435d033e59c5bdccbb76ce4`.

La lectura de `GET /api/catalog/home` devolvió HTTP 200, `X-Catalog-Source: REAL` y `Cache-Control: no-store`. Los request IDs comunicados para el recorrido fueron `4abf488e-7597-430f-949b-ae73b2d4bdbd` y `c629dcc7-3b49-4d4b-822a-623bdaf31ea0`. El detalle estructurado y sanitizado está en [`TASK-F006-QA-001-vercel-ui.json`](./TASK-F006-QA-001-vercel-ui.json).

## Corte y límites

Andrés comunicó `ce72b5d73e422dae77f56c4e6edb04983377dc31` como SHA del Frontend en Vercel. Ese SHA coincide con el `HEAD` de `main` consultado en GitHub, pero no se obtuvo metadata directa del runtime de Vercel; por eso queda como SHA reportado, no como verificación independiente del deployment.

Este retest cubre la vista Home publicada con categorías y el destacado QA visible. No repite los estados vacíos/de error, el enlace de categoría ni el favorito sin sesión; esos casos conservan su evidencia previa y requieren la revisión correspondiente. No se ejecutó prueba de BFF ni BE #45. No se modificó el estado de la issue.

La captura y el JSON no contienen cookies, credenciales, headers de autorización ni datos personales.
