# Encargo de integración de favoritos: F-037 y F-038

Fecha: 2026-10-16. Estado: propuesta de contrato pendiente de implementación y validación en Backend. No acredita homologación de Productos/Seguridad, cierre de gates ni integración real. Frontend implementa las vistas y adaptadores; este encargo solicita los endpoints restantes. No implementar ficha, login ni vistas de carrito en este corte. El movimiento de favoritos al carrito (F-039) queda fuera de esta entrega: su contrato debe reespecificarse antes de reabrirse.

## Fuentes y decisiones

- SPECS: `SPECS/funcional`, `SPECS/contrato-api`, `SPECS/componentes-react` F-036–038; `SPECS/ui/vistas/V-009-favoritos.md`; overlays O-003/O-006; `plan/DECISIONES-Y-BLOQUEOS.md` (I-01, G-AUTH, G-SKU, G-UNDO).
- Figma: archivo `k6JZRdgbO7YtZXeFqygE8p`, página `1:4`; V-009 `206:3140`, `206:3224`, `206:3299`, `206:3362`, `206:3393`, `206:3483`, `206:3514`, `206:3599`, `206:3685`, `206:3761`; O-006 `215:2976`, `215:3135`.
- Decisiones del usuario: SPEC funcional prevalece sobre Figma; favoritos por producto, nunca selección persistida de talla/SKU; agotados separados de retirados; no porcentajes ni reserva de 20 minutos ficticios. Deshacer mediante POST después de DELETE confirmado; puede fallar.
- El módulo de carrito ya existe. Este corte no lo consume desde favoritos; movimiento de favoritos al carrito diferido.

## Operaciones requeridas

| Backend | BFF Next | Situación |
|---|---|---|
| `GET /api/v1/wishlist` | `GET /api/wishlist` | Falta backend; lectura del titular, orden `createdAt DESC`. |
| `POST /api/v1/wishlist/items` | `POST /api/wishlist/items` | Existente; conservar `{productId}` y `201/200`. También restaura tras quitar. |
| `DELETE /api/v1/wishlist/items/{productId}` | DELETE equivalente | Existente; `204`, incluso ausente; aislado por titular. |
| Movimiento al carrito (F-039) | — | Fuera de alcance de esta entrega; requiere contrato nuevo. |

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

## Movimiento al carrito (F-039): diferido

El movimiento de favoritos al carrito no forma parte de esta entrega. No se define endpoint, cabecera de idempotencia, snapshot ni errores asociados: cualquier contrato anterior queda anulado y deberá reespecificarse junto con Backend y el módulo de carrito en un corte posterior. El BFF no expone ninguna ruta de movimiento y las vistas no ofrecen esa acción.

## Errores públicos

Formato `{code,message}` con texto público, sin token, customerId, stack ni cuerpos externos. Frontend usa mensajes locales.

| HTTP / code | Comportamiento |
|---|---|
| `401 UNAUTHORIZED` | Limpiar datos privados y pedir sesión; no conservar tarjeta anterior accesible. |
| `503 CATALOG_UNAVAILABLE` | Error de consulta con reintento, nunca falso vacío. |
| `503 WISHLIST_UNAVAILABLE` | Endpoint ausente o no disponible; nunca se interpreta como `[]`. |
| `404 PRODUCT_NOT_AVAILABLE` | Producto inactivo/retirado; conservar intención, permitir quitar. |
| `400 INVALID_PRODUCT_ID` / `INVALID_REQUEST` | Rechazo sin mutación. |

`PRODUCT_NOT_AVAILABLE` se aplica al POST de restauración sobre un producto inactivo. No hay `redirectUrl` ni errores de movimiento: F-039 está fuera de alcance.

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
```

Activar lectura después de verificar GET/DTO. Requiere además la sesión sandbox explícita de H3; no es auth de producción. Las rutas devuelven indisponibilidad explícita mientras estén deshabilitadas.

Backend debe devolver: rama/commit, OpenAPI, versión de DTO, comandos de prueba y fixtures, decisión de idempotencia/migración/retención, errores de favorito ausente, evidencia A/B y validación de gates. Después frontend ejecuta E2E conectado sin interceptar HTTP, consulta PostgreSQL de prueba y documenta limitaciones restantes.

No se incluye código backend en esta entrega. No se crean ni publican commits automáticamente. La copia en Backend de este documento es el encargo de trabajo; los cambios de contrato deben acordarse antes de activar flags.
