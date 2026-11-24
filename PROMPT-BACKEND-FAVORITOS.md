# Encargo backend: conexiones de favoritos

## Objetivo y autorización

Audita y completa el lado backend de favoritos para que un usuario autenticado guarde un producto del catálogo, consulte la lista, abra la ficha del mismo producto y agregue una unidad al carrito del mismo titular, conservando el favorito. Revisa primero las instrucciones de tu repositorio. Reutiliza los endpoints existentes; no los dupliques.

Este documento es un encargo para el responsable de backend, no evidencia de ejecución. El trabajo frontend se limita a favoritos. No modificar catálogo, detalle, login, carrito ni Docker sin autorización específica para esos módulos: identificar sus dependencias y devolver el contrato necesario.

## Hallazgos reproducibles por inspección

- Catálogo: `src/catalog/fixtures.ts` utiliza IDs `mock-product-{n}` y slugs `producto-demostracion-{n}`. Detalle incluye esos slugs y el fixture `PRD-MOCK-001`.
- `SandboxProductEligibility` solo acepta `SANDBOX_ACTIVE_PRODUCTS`. `SandboxWishlistCatalog` define `PRD-1`, `PRD-VARIANT`, `PRD-OUT-OF-STOCK` y `PRD-COMMERCE-UNAVAILABLE`, con slugs propios. No hay equivalencia automática con los productos del catálogo.
- `WishlistModule` enlaza elegibilidad y catálogo a adaptadores sandbox. Guardar, leer o cotizar no acredita integración con Productos real.
- `AuthService.login` devuelve `mode: MOCK, authenticated: false`; no emite cookie, token ni sesión.
- Favoritos usa `IdentityGuard` con Bearer. El frontend usa temporalmente una sesión sandbox A/B, no el login del proyecto. El carrito normal reenvía cookies y Authorization explícito; no se acredita que use la misma identidad de favoritos.
- Compose H3 compila el frontend en producción; el sandbox de favoritos se bloquea deliberadamente en producción. No proponer habilitar el sandbox como solución de acceso real.

## Endpoints existentes que debes verificar

| Operación | Contrato |
|---|---|
| Guardar | `POST /api/v1/wishlist/items`, JSON `{productId}`; `201` creado, `200` existente. Repetir no duplica ni renueva fecha. |
| Leer | `GET /api/v1/wishlist`; arreglo del titular, ordenado de más reciente a más antiguo. Vacío real `[]`. |
| Quitar | `DELETE /api/v1/wishlist/items/{productId}`; `204`, incluso ausente, sin afectar otro titular. |
| Agregar al carrito | `POST /api/v1/wishlist/items/{productId}/add-to-cart`; sin cuerpo, query ni idempotency-key; `200` con `{productId,cart}`. |

Lectura por elemento: `productId`, `createdAt` ISO, `name`, `slug`, `brand`, `image:{url,alt}`, `price:{amount,currency}`, `availability: AVAILABLE|OUT_OF_STOCK|UNAVAILABLE`. Los campos de catálogo pueden ser null cuando el producto está retirado; no inventar precio, stock ni slug. Disponible/agotado exige nombre y slug válidos. Mantener coherencia con `src/features/wishlist/contract.ts` del frontend.

Snapshot de adición: `cartId` no vacío, `version` entero no negativo, `items` con SKU ?nico y cantidad entera positiva; `unitPrice`, cuando exista, contiene amount finito no negativo, currency ISO y version entera no negativa. Confirmar que la respuesta corresponde al carrito persistido y al mismo usuario que la lectura normal de carrito.

## Trabajo solicitado

1. Entregar una matriz ID → slug → SKU por producto compartido entre catálogo, ficha y favoritos. Corregir dentro de favoritos los adaptadores que no consulten el catálogo autorizado; si exige otro módulo, documentar el bloqueo en vez de inventar equivalencias.
2. Verificar proyección de lectura, orden y persistencia. Un fallo global de catálogo es `503 CATALOG_UNAVAILABLE`, nunca `[]` ni productos supuestamente agotados.
3. Especificar la sesión compartida necesaria: emisor/validador aceptado, identidad del titular, cómo Next obtiene y propaga credenciales, comprobación de sesión, expiración y cierre. Indicar integración con cookies de carrito y política para carrito anónimo previo. No implementar un login nuevo en este encargo.
4. Auditar la transacción de adición: comprueba favorito del titular, resuelve SKU, agrega una unidad, conserva el favorito, aplica stock y devuelve snapshot confirmado. No seleccionar arbitrariamente talla/SKU.
5. Mantener errores públicos `{code,message}`: `401 UNAUTHORIZED`; `503 AUTH_UNAVAILABLE`, `CATALOG_UNAVAILABLE`, `COMMERCE_DATA_UNAVAILABLE`; `404 PRODUCT_NOT_AVAILABLE`; `409 CART_CONFLICT` o `STOCK_LIMIT_REACHED`; `422 VARIANT_SELECTION_REQUIRED` con `redirectUrl` interno `/productos/{slug}`. Documentar diferencias del contrato real antes de cambiarlas.
6. Proponer reconciliación de adiciones inciertas. La operación actual no es idempotente y rechaza idempotency-key; no recomendar reintentos ciegos. Explicar qué lectura autoritativa permite comprobar el efecto y qué ambigüedades persisten con concurrencia.
7. Entregar fixtures de dos titulares, producto simple, variantes, agotado y retirado, con un producto compartido que realmente abra una ficha. Incluir comandos locales reproducibles sin secretos.

## Evidencias y criterios de aceptación

- Guardar dos veces: una fila persistida; quitar dos veces: 204; restaurar activo/inactivo con resultados correctos.
- Lista vacía del titular, aislamiento A/B, token inválido/vencido, dependencia de identidad caída y fallo de catálogo.
- Abrir el slug de un favorito devuelve el mismo productId en ficha.
- Agregar una unidad conserva el favorito y la lectura ordinaria del carrito del mismo usuario refleja el cambio.
- Variantes, stock insuficiente, favorito ausente, concurrencia y pérdida de respuesta no generan ?xitos ficticios.
- Devolver rama/commit, contrato/OpenAPI, pruebas ejecutadas y resultados, fixtures, configuración necesaria y bloqueos con responsable.

Distinguir inspección, pruebas con mocks, persistencia local y servicios externos reales. No declarar completo el recorrido mientras falte sesión compartida, catálogo coherente o verificación del carrito autenticado. No hacer reset de BD ni publicar secretos.
