# Encargo de integración de favoritos: F-037 y F-038

> Revisión F-039 del 03/11/2026: [conexión con sesión web](F039-SESION-WEB.md). La operación ya puede reutilizar la sesión G1 con opt-in explícito; la homologación REAL y el cierre contractual siguen pendientes. Los apartados históricos que describen exclusivamente sandbox deben leerse con esta actualización.

Actualizado el 17/10/2026. Backend local ya implementa lectura y adición al carrito; falta validar sesión, proyección y productos compartidos. Se reabre la preparación de adición exclusivamente dentro de favoritos, opcional y apagada por defecto. No se modifica ficha, login, carrito, backend ni configuración global. No acredita integración real. Ver [revisión](REVISION-CONEXIONES-FAVORITOS.md) y contrato de integración documentado en esta guía.

## Fuentes y decisiones

- SPECS: `SPECS/funcional`, `SPECS/contrato-api`, `SPECS/componentes-react` F-036–038; `SPECS/ui/vistas/V-009-favoritos.md`; overlays O-003/O-006; `plan/DECISIONES-Y-BLOQUEOS.md` (I-01, G-AUTH, G-SKU, G-UNDO).
- Figma: archivo `k6JZRdgbO7YtZXeFqygE8p`, página `1:4`; V-009 `206:3140`, `206:3224`, `206:3299`, `206:3362`, `206:3393`, `206:3483`, `206:3514`, `206:3599`, `206:3685`, `206:3761`; O-006 `215:2976`, `215:3135`.
- Decisiones del usuario: SPEC funcional prevalece sobre Figma; favoritos por producto, nunca selección persistida de talla/SKU; agotados separados de retirados; no porcentajes ni reserva de 20 minutos ficticios. Deshacer mediante POST después de DELETE confirmado; puede fallar.
- El módulo de carrito ya existe. Favoritos prepara el consumo opcional de su endpoint existente, sin modificar el módulo de carrito.

## Operaciones requeridas

| Backend | BFF Next | Situación |
|---|---|---|
| `GET /api/v1/wishlist` | `GET /api/wishlist` | Existente en backend local; pendiente validación de proyección e identidad, orden `createdAt DESC`. |
| `POST /api/v1/wishlist/items` | `POST /api/wishlist/items` | Existente; conservar `{productId}` y `201/200`. También restaura tras quitar. |
| `DELETE /api/v1/wishlist/items/{productId}` | DELETE equivalente | Existente; `204`, incluso ausente; aislado por titular. |
| Adición al carrito | `POST /api/wishlist/items/{productId}/add-to-cart` | Backend: `POST /api/v1/wishlist/items/{productId}/add-to-cart`; frontend opcional, apagado por defecto. |

Ninguna operación recibe customerId del cliente. Backend deriva titular del JWT. BFF conserva tokens en servidor, usa cookie HttpOnly opaca y `Cache-Control: no-store, private`. El sandbox sigue limitado a development/test; no activar en producción para suplir G-AUTH.

## GET: propuesta exacta consumida por frontend

Respuesta `200`: arreglo (no envelope `data`). `[]` solo significa lista confirmada vacía.

```json
[
  {
    "productId": "PRD-1",
    "createdAt": "2026-10-16T12:00:00.000Z",
    "name": "Producto de prueba",
    "slug": "producto-de-prueba",
    "brand": "Marca",
    "image": {"url": "https://example.com/product.png", "alt": "Producto de prueba"},
    "price": {"amount": 349.9, "currency": "PEN"},
    "availability": "AVAILABLE"
  }
]
```

| Campo | Regla |
|---|---|
| `productId` | String contractual F-036: 1–100 caracteres Unicode, sin espacios exteriores ni controles; único en el arreglo. |
| `createdAt` | Fecha ISO de guardado, del backend; mantener orden descendente. POST idempotente no renueva fecha de un registro existente. |
| `name`, `slug` | Requeridos salvo `UNAVAILABLE`, donde pueden ser null. Slug `[a-z0-9]+(?:-[a-z0-9]+)*`. |
| `brand` | String o null; no usar IDs internos como marca visible. |
| `image` | Objeto `{url,alt}` o null. URL HTTPS; fixtures locales `/figma/...` o `/fixtures/...` solo en sandbox. |
| `price` | Objeto `{amount,currency}` o null. Importe finito no negativo, moneda ISO de tres letras. Informativo; no recalcular compra. |
| `availability` | `AVAILABLE`, `OUT_OF_STOCK` o `UNAVAILABLE`. Estado comercial de producto, no saldo numérico ni elegibilidad de una talla arbitraria. |

Para retirado sin datos: conservar productId/createdAt, campos de catálogo null, `UNAVAILABLE`. Frontend usa texto e imagen neutros; no borra intención. Si Catálogo falla globalmente o no permite una proyección coherente, responder `503 CATALOG_UNAVAILABLE`; jamás convertirlo en `[]`, agotado supuesto ni precio cero.

## Adición al carrito: preparación opcional

POST sin cuerpo ni idempotency-key al endpoint existente. Respuesta 200 `{productId,cart}` con snapshot validado: cartId, version e items con sku, quantity y unitPrice opcional. Agrega una unidad y conserva el favorito. No es idempotente.

`H3_WISHLIST_CART_ENABLED` queda false por defecto. Con `G1_AUTH_ENABLED=true` utiliza las cookies opacas de sesión G1 mediante el BFF compartido, con sandbox deshabilitado. Sin auth web requiere sandbox development/test. No activar para uso integrado hasta homologar los gates y validar proveedores REAL. En 422 VARIANT_SELECTION_REQUIRED ofrecer redirectUrl de ficha interna, con retorno a favoritos. En 409 manejar stock/conflicto. En pérdida de respuesta bloquear una nueva adición del producto durante la vida de la vista, incluso tras refrescar la lista o cerrar el aviso. No reintentar automáticamente. Salir o recargar reinicia ese bloqueo; la reconciliación autoritativa sigue pendiente.

## Errores públicos

Formato `{code,message}` con texto público, sin token, customerId, stack ni cuerpos externos. Frontend usa mensajes locales.

| HTTP / code | Comportamiento |
|---|---|
| `401 UNAUTHORIZED` | Limpiar datos privados y pedir sesión; no conservar tarjeta anterior accesible. |
| `503 CATALOG_UNAVAILABLE` | Error de consulta con reintento, nunca falso vacío. |
| `503 WISHLIST_UNAVAILABLE` | Endpoint ausente o no disponible; nunca se interpreta como `[]`. |
| `404 PRODUCT_NOT_AVAILABLE` | Producto inactivo/retirado; conservar intención, permitir quitar. |
| `400 INVALID_PRODUCT_ID` / `INVALID_REQUEST` | Rechazo sin mutación. |

`PRODUCT_NOT_AVAILABLE` se aplica al POST de restauración sobre un producto inactivo. La adición admite redirectUrl solo para seleccionar variante. Los errores de carrito e identidad se detallan en el prompt actualizado.

## Deshacer F-038/O-006

Eliminación optimista visual, rollback aislado ante rechazo confirmado. Si se pierde respuesta, frontend conserva la incertidumbre y repite el DELETE idempotente para confirmar antes de ofrecer Deshacer. Nunca enviar POST de restauración mientras DELETE siga pendiente.

Tras `204`, aviso de 5 segundos de tiempo disponible, pausado por foco/hover. Restaurar con POST F-036; `201/200` confirma guardado, `404` por inactivo no se presenta como éxito. Después se relee GET para obtener orden/fecha autoritativos. No se promete fecha o posición histórica. Stock de una talla no determina por sí solo elegibilidad del favorito. Esta estrategia es una decisión local del usuario; registrar revisión de G-UNDO sin declarar su homologación automáticamente.

## Fixtures y matriz de aceptación de backend

Entregar al menos: cliente A/B; producto vendible; agotado; retirado; catálogo caído; favorito ausente; token inválido/vencido. Los escenarios de frontend son simulaciones independientes, no fixtures persistidos ni aceptación de integración.

- [ ] GET filtra por titular, ordena y distingue vacío/retirado/503.
- [ ] POST repetido no duplica ni modifica fecha; DELETE repetido responde 204 sin afectar ajenos.
- [ ] Restauración de activo/inactivo, aislamiento A/B y sesión vencida probados.
- [ ] OpenAPI actualizado, ejemplos exactos y migraciones documentadas, sin reset de base de desarrollo.

## Activación y entrega

En Next, flags server-only inicialmente false:

```dotenv
H3_WISHLIST_READ_ENABLED=false
H3_WISHLIST_CART_ENABLED=false
```

Activar lectura después de verificar GET/DTO. Requiere además la sesión sandbox explícita de H3; no es auth de producción. Las rutas devuelven indisponibilidad explícita mientras estén deshabilitadas.

Backend debe devolver: rama/commit, OpenAPI, versión de DTO, comandos de prueba y fixtures, decisión de idempotencia/migración/retención, errores de favorito ausente, evidencia A/B y validación de gates. Después frontend ejecuta E2E conectado sin interceptar HTTP, consulta PostgreSQL de prueba y documenta limitaciones restantes.

No se incluye código backend en esta entrega. No se crean ni publican commits automáticamente. El prompt enlazado es el encargo de trabajo; los cambios de contrato deben acordarse antes de activar flags.
