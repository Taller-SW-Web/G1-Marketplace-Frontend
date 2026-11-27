# H5 · Estados sobre el Frontend publicado en Vercel

Retest del 26 de noviembre de 2026 a las 23:11 Lima. El resultado fue **16 casos aprobados y dos casos de dirección pendientes**. Hay 34 capturas. Chrome abrió el Frontend publicado en escritorio 1280 × 900 y móvil 390 × 844. El navegador simuló las respuestas HTTP de cada caso y bloqueó las solicitudes que podían escribir. Favoritos y dirección usaron una sesión sintética dentro del navegador.

| Vista | Fallo y resultado comprobados en los dos tamaños |
| --- | --- |
| V-005 · Inicio | 503 con reintento, seguido del estado de portada sin categorías ni destacados. |
| V-006 · Catálogo | Timeout e indisponibilidad, seguidos del estado sin coincidencias. Se conservó la búsqueda. |
| V-008 · Carrito | 503 con reintento y carrito vacío tras 200. |
| V-009 · Favoritos | 503 con reintento y lista vacía tras 200, usando sesión sintética. |
| V-010 · Dirección | El checkout público mostró datos de prueba sin consultar el endpoint de direcciones. El caso de fallo queda pendiente en un despliegue conectado. |
| V-015 · Historial | 503 con reintento e historial vacío tras 200. |
| V-016 · Detalle | 503 con reintento, seguido de un 404 que muestra «Pedido no disponible». |
| V-017 · Seguimiento | 503 con reintento, seguido de un 202 que muestra que el pedido aún no está en despacho. |

El [registro](resultados.json) enlaza las capturas por caso y conserva los identificadores HTTP de las solicitudes de documento a Vercel. La prueba acredita cómo responde la interfaz publicada a cada respuesta simulada. La validación de G6, G7 y Ventas durante una caída requiere un entorno integrado de QA.

Con Chrome y las dependencias de Frontend instaladas:

```bash
node scripts/qa-h5-estados-publicados.mjs test-results/h5-vercel-estados
```
