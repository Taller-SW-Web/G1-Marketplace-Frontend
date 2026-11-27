# TASK-F009-QA-001 — retest de orden en Vercel

**Resultado: INCONCLUSO para aceptación UI. Issue #34 permanece abierta.**

## Alcance y despliegue

- **Captura UTC:** `2026-11-27T20:41:13.990Z`; recorrido total del navegador: 3.715 s.
- **URL:** [Catálogo Vercel](https://g1-marketplace-frontend.vercel.app/catalogo?q=G6%20QA%20Marketplace%20Desempate&pageSize=1), con búsqueda del producto de QA y `pageSize=1` en el estado de ruta.
- **SHA:** GitHub `main` fue consultado durante esta pasada y apunta a [`ce72b5d73e422dae77f56c4e6edb04983377dc31`](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/commit/ce72b5d73e422dae77f56c4e6edb04983377dc31). Andrés había comunicado ese SHA como el despliegue de Vercel; esta captura no verifica la versión que ejecutaba el runtime.
- **Método:** Chrome local con Playwright; inspección de la UI publicada y observación de sus propias solicitudes. No se hicieron llamadas BFF/API directas.

## Evidencia observada

La ruta cargó `Catálogo | Inka Athletics`. La UI mostró 2 productos coincidentes, una tarjeta en pantalla, `Mostrando 1–1 de 2 productos`, `Página 1 de 2` y un botón `Siguiente`. En el DOM renderizado no había elementos `<select>` ni control etiquetado `Ordenar por`. La tarjeta visible corresponde a **G6 QA Marketplace Desempate**.

La única solicitud de productos observada, originada por la UI, fue:

- `GET /api/catalog/products?q=G6+QA+Marketplace+Desempate&pageSize=1`
- **HTTP 200**, `X-Catalog-Source: REAL`, `Cache-Control: no-store`
- **X-Request-Id:** `b507f65e-c187-46bc-a5b0-ca8ebfba6228`
- Respuesta: `totalElements=2`, `totalPages=2`, `pageNumber=0`; producto `ord-002` (`8ad24563-c9da-4305-b650-1dd47a14fffb`).
- Errores de página: 0.

[Captura PNG](./vercel-catalog-order.png) · SHA-256 `cce5bac3076f5a86ad0bda883c185c3a06d9b5e7c1486621642a2110e4b115ac` · [Datos sanitizados](./TASK-F009-QA-001-vercel-ui.json).

## Criterios que quedan sin verificar

La UI publicada no ofreció el selector de orden. Por ello no se pudieron seleccionar `NAME_ASC`/`NAME_DESC`, observar sus resultados, comprobar que cambiar el orden reinicia la página, contrastar continuidad ordenada entre páginas ni probar si un enum inválido se bloquea antes del proveedor. No se manipuló directamente el parámetro `sort`. Aunque la página 2 estaba disponible, no se navegó a ella: sin el selector no se podía comprobar continuidad de resultados bajo los órdenes pedidos.

La respuesta `REAL` y el producto en la página inicial no acreditan el comportamiento de F-009 en ambos sentidos. Esto no prueba un defecto del ordenamiento ni una caída del sitio; documenta que el corte UI observado no expuso el control necesario para aceptarlo. FE #33 tiene implementación incorporada en Frontend #124, pero su aceptación independiente sigue separada. BE #56/#57 no se retestearon; la evidencia APIM de #57 no sustituye la aceptación visual de #34.

**Conclusión:** no está lista para revisión/cierre de aceptación visual. Requiere un corte publicado que exponga el selector `Ordenar por` y una nueva pasada UI con ambos sentidos y continuidad. No se cambió el estado de la issue.
