# Revisión de conexiones de favoritos

Revisión local del 17/10/2026 sobre frontend `a96f4d4` y código backend hermano disponible. Solo se modifican favoritos, sus endpoints, estilos, pruebas y documentación. No se modifica backend ni otros feats. Las referencias al backend describen el código local inspeccionado, no un despliegue verificado.

## Matriz de conexiones

| Recorrido | Evidencia y estado | Dependencia / responsable |
|---|---|---|
| Catálogo → guardar | Control existente `FavoriteControl` → `mutateItem` → Next POST `/api/wishlist/items` → Nest POST `/api/v1/wishlist/items`. Cadena inspeccionada; proxies probados con fetch simulado. Integración completa **bloqueada**. | Backend favoritos debe aceptar IDs del catálogo; acceso debe proporcionar sesión. |
| Guardar repetido y persistir | Backend tiene creación idempotente por titular; frontend acepta 201/200. Persistencia real **no verificada** en esta revisión. | Backend: evidencia PostgreSQL, fecha estable y aislamiento A/B. |
| Consultar favoritos | Next GET `/api/wishlist` → Nest GET `/api/v1/wishlist`; DTO validado y errores explícitos. Proxy **verificado con mocks**. | Acceso y proyección de productos compartidos pendientes. |
| Favoritos → ficha | Imagen y nombre usan `/productos/{slug}?returnTo=%2Ffavoritos`. En agotados se conserva enlace; retirados no lo ofrecen. Handoff **verificado por pruebas de UI**; existencia de cada ficha real **bloqueada**. | Backend debe entregar slug coherente, no un producto equivalente inventado. |
| Ficha → favoritos | El validador de detalle acepta retorno interno. Sus enlaces de error/no disponible pueden decir ?Volver al catálogo? aunque apunten a favoritos. Solo inspeccionado. | Responsable de detalle: revisar etiqueta y retorno visible en todos los estados. Sin cambios en ese feat. |
| Vacío → catálogo | CTA `Explorar productos`, href `/catalogo`; pruebas de componente y navegación E2E. | No requiere nuevo endpoint; vacío válido sí requiere GET exitoso con []. |
| Quitar y deshacer | DELETE idempotente y POST de restauración; rollback, incertidumbre y expiración cubiertos por pruebas existentes de favoritos. | Backend debe acreditar persistencia e identidad. |
| Favoritos → carrito | Nueva ruta Next POST `/api/wishlist/items/{productId}/add-to-cart`, adaptador y acción opcional. Contrato y controlador **verificados con mocks**. Uso integrado **bloqueado y apagado por defecto**. | Misma identidad y carrito que el módulo normal; no se modifica carrito. |

## Bloqueos concretos

1. **Identidad:** login devuelve `authenticated:false` y no crea sesión. Favoritos sigue usando h3-session A/B; no se sustituye por un usuario ficticio de producción. Responsable: acceso/backend. Aceptación: sesión verificable que permita consultar favoritos y el mismo carrito, expire y cierre correctamente.
2. **Productos:** catálogo genera `mock-product-{n}` / `producto-demostracion-{n}`. Favoritos backend admite PRD-1, PRD-VARIANT, PRD-OUT-OF-STOCK y PRD-COMMERCE-UNAVAILABLE. Sus slugs no son los fixtures compartidos de detalle. Responsable: backend favoritos con catálogo. Aceptación: un ID guardado desde catálogo produce el mismo producto y ficha en favoritos.
3. **Docker:** frontend compilado ejecuta NODE_ENV=production; sandbox solo development/test. Se corrigió el rechazo del hostname interno en los proxies propios de favoritos reutilizando `marketplaceApiUrl`, pero eso no habilita sesión en Docker. Responsable: acceso/entorno. No relajar sandbox ni modificar Compose en este encargo.
4. **Carrito:** no se acredita que la identidad sandbox Bearer sea la utilizada al navegar al carrito normal. Responsable: acceso/carrito/backend. Aceptación: agregar con favoritos y leer desde carrito con el mismo titular y snapshot coherente.
5. **Sincronización inicial:** el provider sincroniza controles al guardar/quitar y al leer la lista; no se acredita hidratación global de todos los corazones del catálogo tras una recarga antes de consultar favoritos. Revisar cuando exista la sesión compartida, dentro del provider de favoritos.

## Cambios propios de favoritos

- Proxies de lectura y mutación reutilizan el validador existente para loopback, HTTPS o hostname interno explícitamente autorizado. No admiten hostname HTTP arbitrario.
- Adición opcional de una unidad conservando el favorito. Respuesta validada y filtrada; Bearer solo en servidor; sin cuerpo ni idempotency-key. Validación de origen y sesión existentes conservada.
- Solo producto disponible permite agregar. Doble pulsación mientras hay una solicitud no duplica llamadas. Selección de variante ofrece ficha interna con retorno a favoritos.
- Resultado incierto bloquea otra adición para ese producto durante la vida de la vista, incluso al refrescar la lista o cerrar el aviso. Se permite revisar carrito; no se reenvía automáticamente. No es idempotencia persistente: salir de la vista o recargar recrea el controlador. Antes de repetir debe reconciliarse el carrito autoritativo; esa integración está pendiente.
- Estilos del botón en módulo CSS exclusivo de favoritos; no se toca globals.css ni el layout de otros módulos.

## Configuración de auditoría, apagada por defecto

La opción server-only `H3_WISHLIST_CART_ENABLED=true` permite exponer el adaptador para auditoría local. No configurada equivale a false. Además exige sandbox existente con NODE_ENV development/test, H3_FRONTEND_SANDBOX_ENABLED=true, origen exacto y tokens A/B válidos. GET mantiene su bandera separada H3_WISHLIST_READ_ENABLED=true. No publicar tokens.

No activar para una demostración integrada hasta comprobar identidad y carrito compartidos. No basta agregar una variable al Compose: producción sigue rechazando el sandbox. La demo en memoria mantiene su adaptador sin acción de carrito. Ninguna configuración global se cambia automáticamente.

## Reproducción y evidencias

- `npm run typecheck`
- `npm run test:server`: fetch de backend simulado; no prueba PostgreSQL.
- `npm run test:components`: controlador, transporte, enlaces y estados de favoritos, además de regresiones existentes.
- `npm run test:e2e:favorites:ui`: demo en memoria y respuestas interceptadas para /favoritos; no acredita backend real. Incluye navegar desde vacío al catálogo y enviar slug/returnTo a detalle.
- Lint limitado a los archivos propios modificados.

Durante la revisión no respondían http://127.0.0.1:10000/ready ni http://127.0.0.1:3000/. No se levantó ni alteró Docker, no se emitieron tokens, no se migró BD y no se ejecutaron mutaciones reales de backend. No se acredita aislamiento A/B persistido ni integración real con catálogo, carrito o acceso.

Resultados finales:

| Comprobación | Resultado |
|---|---|
| Typecheck | Correcto, exit 0. |
| Componentes/regresiones | 25 archivos, 193 pruebas aprobadas, exit 0. |
| Handlers de servidor | 3 archivos, 55 pruebas aprobadas, exit 0. |
| ESLint de favoritos y pruebas modificadas | Correcto, exit 0. |
| E2E de interfaz | 10 aserciones de casos completas/aprobadas, incluida navegación a catálogo. El proceso quedó esperando durante el cierre del servidor y se interrumpió con Ctrl+C (exit 1); no se acredita una ejecución E2E con cierre limpio. |

Las pruebas nuevas cubren adición opcional, validación de snapshot, doble pulsación, incertidumbre sin reintento, variantes, sesión vencida y host interno autorizado. Ninguna utiliza una base de datos real. Encargo accionable: [PROMPT-BACKEND-FAVORITOS.md](../PROMPT-BACKEND-FAVORITOS.md).
