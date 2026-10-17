# Catálogo H3 conectado a G6

Corte: 17/10/2026. La integración F-006/F-007 pasa por Next → BFF NestJS → API G6. El frontend sólo configura `MARKETPLACE_API_URL`; no lleva URL de G6, token técnico ni un flag público de autenticación.

## Demo reproducible

Desde la carpeta hermana Backend:

```powershell
docker compose -p g1-marketplace-h3-g6-demo -f compose.h3.yaml -f compose.h3.g6-demo.yaml up --build --detach --wait --wait-timeout 180
npm run check:g6 -- --home-only --via-web --base-url http://127.0.0.1:3300
```

Abrir `http://localhost:3300/`. El proyecto separado configura el adaptador Backend REAL con modo explícito `demo-no-auth` de G6. La demo habitual de `compose.h3.yaml` conserva MOCK en 3000/10000. No requiere cambiar `.env` de Frontend.

| Acción | Petición del navegador | Evidencia esperada según corte público 07:33 Lima |
|---|---|---|
| Abrir Inicio | `GET /api/catalog/home` | 200, categorías activas y `X-Catalog-Source: REAL` |
| Buscar `zapatillas` | `GET /api/catalog/products?q=zapatillas` | 503 REAL y error con Reintentar mientras el proveedor mantenga su 503 |
| Buscar `x` | Validación de UI | Mensaje de 2–120 caracteres, sin nueva petición de productos |

El proxy conserva JSON, estado HTTP, `Cache-Control: no-store`, `X-Catalog-Source` y `X-Request-Id`. No reenvía cookies ni Authorization del visitante al BFF público de catálogo. Un fallo externo no se convierte en vacío ni en MOCK. DevTools muestra Next → BFF; la URL externa y `X-Correlation-Id` se verifican en configuración y código Backend.

La nueva regresión del Route Handler cubre home 200 REAL y productos 503 REAL con correlación y ausencia de identidad del visitante. No cambia la lógica visual de Inicio/Catálogo, que ya admite categorías por API y errores recuperables.

## Alcance y comprobación previa

El 17/10/2026 a las 07:33 Lima, categorías respondió 200 con ocho entradas sin token y productos/listado/búsqueda/detalle devolvieron 503. Repetir las lecturas antes de exponer: este estado puede cambiar. Categorías reales no acredita búsqueda real exitosa, Seguridad/G7 ni despliegue de G1 en Vercel.

La [guía Backend](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/blob/feat/s1-f006-f007-catalogo/docs/INTEGRACION-G6-H3.md) documenta origen, contrato fijado, modo de autenticación, logs y vuelta al entorno habitual.
