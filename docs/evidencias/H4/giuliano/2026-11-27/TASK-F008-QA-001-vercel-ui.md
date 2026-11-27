# FE #32 — retest de filtros en la UI publicada

**Captura UTC:** 2026-11-27T20:28:11.725Z  
**Issue:** [TASK-F008-QA-001](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/32)  
**Entorno:** [Catálogo publicado en Vercel](https://g1-marketplace-frontend.vercel.app/catalogo)  
**Navegador:** Chrome local con Playwright; navegación `domcontentloaded` en 24.2 s; cero errores de página.

## Resultado

La ruta `/catalogo` cargó y mostró la navegación de categorías y el catálogo sin filtros, con 49 productos (página 0 de 3). La solicitud generada por la UI `GET /api/catalog/products` respondió HTTP 200, `X-Catalog-Source: REAL`, `Cache-Control: no-store`, request ID `3232b950-ca46-4381-a18b-e5e962748b41`. No se envió query de filtros. La captura [`vercel-catalog-ui.png`](./vercel-catalog-ui.png) muestra el corte publicado.

En el DOM no se renderizó el panel ni el botón **Filtros**, los selectores de categoría/marca, los campos de precio, el control de orden ni **Aplicar/Limpiar**. La etiqueta “Categoría” encontrada correspondía a la navegación lateral, no a un selector de filtros. Por ello no se pudo ejecutar desde controles publicados el rango S/40–50, la combinación categoría/marca, el rango invertido, preservar búsqueda/orden, reset ni los casos móviles de cancelar/Escape/foco. No se generó ninguna solicitud de catálogo con esos parámetros.

## Alcance y dependencias

El resultado es **inconcluso para los criterios de interacción de FE #32**: el catálogo REAL sí respondió, pero el corte visible no expuso los controles requeridos. Esto no acredita falla de Vercel ni de BFF. FE #31 sigue abierta y es la dependencia inmediata para la presencia de los controles; cualquier evidencia de BE #53 se mantiene separada y no se repitió aquí.

Andrés reportó el SHA Frontend `ce72b5d73e422dae77f56c4e6edb04983377dc31` para Vercel. No se confirmó el SHA del runtime durante este retest.

El [JSON sanitizado](./TASK-F008-QA-001-vercel-ui.json) conserva respuestas y límites. La captura y el JSON no contienen cookies, credenciales, headers de autorización ni datos personales. No se modificó el estado de #32.
