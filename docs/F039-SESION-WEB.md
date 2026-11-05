# F-039: conexión de favoritos al carrito con sesión web

03/11/2026. Fase 1.2 derivada de la matriz 1.1, registros FR-93-067 y FR-94-057; issues Frontend #93/#94 y handoff con Backend #190/#192. Base publicada frontend: `5d9cb3a2bcbb70cb3c78b1ea442005ddd49fae33`. No modifica backend, login, carrito ni contrato de prompts CSAT.

## Cambio

La operación publicada solo usaba identidad sandbox A/B y devolvía 404 con auth web sin sandbox. Ahora reutiliza `authRequestGuard` y `bffFetch`, como guardar/listar favoritos. El BFF recibe exclusivamente las cookies G1 opacas admitidas por el transporte existente, con origen validado; no se aceptan Bearer ni titular elegidos por el navegador. El backend conserva la autoridad para validar la sesión y resolver al titular.

La pantalla `/favoritos` evalúa el opt-in en cada petición; no congela el valor del build. El resultado y los errores continúan sanitizados, privados y sin caché. La mutación sigue sin cuerpo, sin Idempotency-Key y sin reintento automático ante incertidumbre. El controlador existente conserva favorito y fecha al agregar y bloquea reenvíos inciertos durante la vida de la vista.

## Configuración

- `H3_WISHLIST_CART_ENABLED=true`: opt-in explícito de la operación. Sigue false por defecto; habilitar login no lo activa.
- Sesión web: `G1_AUTH_ENABLED=true`, `H3_FRONTEND_SANDBOX_ENABLED=false`, `G1_WEB_ORIGIN` y `MARKETPLACE_API_URL` válidos según el transporte auth existente. En producción usa orígenes HTTPS.
- Sandbox local: auth web deshabilitada, sandbox solo development/test, identidad A/B y el mismo opt-in de carrito.
- Si auth web y sandbox están activos simultáneamente, se rechaza la operación; no hay fallback a identidad ficticia.

No se habilitaron flags de ningún entorno externo. La puesta en servicio conserva las dependencias y gates propios de F-039.

## Pruebas

`npm run test:server` incluye `tests/server/favorites-cart-auth.test.ts`: 16 casos nuevos que recorren el handler Next real y transporte BFF existente con un proveedor controlado. Cubre cookie filtrada, sesión A/B compartida entre guardar/listar/agregar/carrito ordinario, preservación del favorito/fecha, opt-in, expiración, origen, inyección de titular, variante/redirecciones y resultado incierto sin retry.

Antes de corregir el código se ejecutó el mismo archivo contra la implementación publicada: 15 fallos y un caso aprobado, originados por la ruta limitada al sandbox. Tras la corrección, los casos pasan. Los tests de controlador existentes cubren doble clic y bloqueo tras incertidumbre; los tests nuevos no sustituyen una prueba REAL G7/G6 ni persistencia PostgreSQL.

## Límites de aceptación

La conexión de código está corregida y probada con proveedor controlado. Quedan pendientes revisión independiente, homologación y casos REAL/despliegue. La discrepancia FE «mover/quitar» frente a BE «agregar conservando» y SPECS #15 continúa registrada: se preserva el comportamiento de la entrega actual sin cambiar unilateralmente los criterios. No se cierra ninguna issue por este cambio.
