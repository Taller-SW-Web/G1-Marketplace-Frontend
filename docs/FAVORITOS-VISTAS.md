# Favoritos: vistas, pruebas y límites de integración

Implementación de frontend para V-009, F-037/038/039, O-003/O-006/O-010. Figma gobierna presentación; las SPEC gobiernan comportamiento. No se alteran SPECS ni se cierran gates por esta entrega.

## Probar sin backend

```powershell
npm run demo:favoritos
```

Abrir `http://127.0.0.1:3200/demo/h3/favoritos/lista`. Elegir **Estado de favoritos** para cambiar escenario. Si el puerto está ocupado por este proyecto, usar esa misma URL; no iniciar otro Next en la misma carpeta. El comando detecta el puerto ocupado sin detener procesos. `-- --port 3210` permite elegir otro puerto cuando no hay otro Next activo en esta carpeta.

La demostración no requiere Docker ni modifica cuentas, favoritos o carritos reales. Sus adaptadores en memoria son independientes de la sesión sandbox del backend. El comando `npm run demo:h3` conserva la prueba conectada anterior de guardar/quitar; también permite abrir las vistas nuevas, pero no convierte sus datos en persistencia real.

| Valor `?estado=` | Escenario / interacción | SPEC |
|---|---|---|
| `lista` | Lista de tres productos. Quitar, deshacer y mover funcionan en memoria. | F-037 |
| `vacio` | Cero productos, CTA Explorar productos. También existe `/lista/vacia`. | F-037 |
| `cargando` | Skeleton y progreso indeterminado; Completar operación simulada resuelve. | F-037 |
| `error-catalogo` | Fallo inicial de consulta; Reintentar recupera la lista. | F-037 |
| `agotados` | Producto sin existencias en sección propia, sin compra, sí eliminación. | F-037/039 |
| `retirado` | Producto inactivo, sin imagen/slug/precio inventados y con eliminación. | F-037 |
| `quitando` | Eliminación pendiente, sin deshacer antes del DELETE. Completar resuelve. | F-038 |
| `error-quitar` | Rechazo restaura tarjeta y foco; Reintentar vuelve a eliminar. | F-038 |
| `eliminado` | DELETE confirmado, Deshacer durante cinco segundos disponibles. | F-038/O-006 |
| `restaurando` | POST de restauración pendiente; Completar resuelve. | F-036/O-006 |
| `restaurado` | Restauración confirmada, listado refrescado y foco recuperado. | O-006 |
| `error-restaurar` | Producto inactivo: no se restaura ni se anuncia éxito; explorar catálogo. | O-006 |
| `moviendo` | Solo tarjeta afectada ocupada, sin retirarla antes del resultado. Completar resuelve. | F-039 |
| `variante` | 422 conserva favorito; Elegir variante enlaza a la ficha con retorno. La ficha la entrega otro integrante. | F-039/F-013 |
| `movido` | Confirmación, favorito retirado, snapshot de carrito simulado consultable. | F-039 |
| `error-mover` | Dependencia falla; tarjeta permanece; Reintentar recupera. | F-039 |
| `incierto` | Simula commit con respuesta perdida; Comprobar resultado repite la clave, nunca suma otra unidad. | F-039/O-010 |
| `sesion-vencida` | Se ocultan todos los productos; aviso de sesión requerida. | O-003 |

Los escenarios inicializan el mismo controlador de estados que usa el adaptador HTTP; no son capturas ni páginas con éxito ficticio. Los escenarios detenidos solo avanzan mediante su botón de completar o cambio de escenario.

## Uso de `/favoritos` e integración

Sin sesión: panel discreto y botón Iniciar sesión deshabilitado, como pidió el usuario. Con sesión sandbox: consulta mediante BFF y muestra el resultado o error explícito. El backend actual no ofrece todavía GET ni movimiento idempotente.

Configuración server-only:

```dotenv
H3_WISHLIST_READ_ENABLED=false
H3_WISHLIST_MOVE_ENABLED=false
```

No activar movimiento antes de validar el contrato durable de Idempotency-Key. Los flags requieren además el sandbox development/test; no habilitan auth de producción. Un error o endpoint faltante nunca equivale a `[]` ni stock agotado. Las rutas públicas de Next son `/api/wishlist`, `/api/wishlist/items` y `/api/wishlist/items/{productId}/move-to-cart`; solo el servidor transmite Bearer a Nest.

Contrato exacto, ejemplos, errores, identidad y checklist: [FAVORITOS-FRONTEND-HANDOFF.md](FAVORITOS-FRONTEND-HANDOFF.md). Se deja copia en `../G1-Marketplace-Backend/docs/FAVORITOS-FRONTEND-HANDOFF.md`. Implementar backend no forma parte de este encargo de frontend.

El contrato propuesto diferencia AVAILABLE, OUT_OF_STOCK y UNAVAILABLE. No persiste variante de SKU ni deduce stock de precio ausente. Imagen y nombre de productos disponibles o agotados enlazan a `/productos/{slug}?returnTo=%2Ffavoritos`; los retirados no ofrecen ficha. Elegir variante utiliza el mismo retorno y la ruta interna validada del backend. En demo, `returnTo` conserva la ruta y el escenario de demostración.

Al preparar el PR se integró `origin/develop`, que ya contiene `src/app/productos/[slug]/page.tsx` y `/carrito`. Las tarjetas ahora abren la ficha existente; tras un movimiento confirmado, Ver carrito enlaza a `/carrito`. La cabecera móvil también permite abrir el carrito. La demo conserva su snapshot simulado y no presenta ese resultado como persistencia del carrito real.

La ficha pertenece a otro integrante y todavía es un corte provisional con datos MOCK; no acredita detalle de catálogo homologado. Debe incorporar el retorno explícito a favoritos: validar `returnTo` como ruta interna permitida y ofrecer Volver a favoritos. No aceptar destinos externos ni URLs con `//`. El retorno enviado por favoritos no contiene identidad, token ni SKU. El botón Atrás del navegador permite regresar durante la prueba de navegación.

Para entregar al cliente deben estar homologados la ficha, los endpoints nuevos y la sesión real. Actualmente la sesión del BFF es exclusivamente sandbox y se cierra en producción. No presentar la demo ni el build correcto como acreditación de estas integraciones. El PR se solicita para auditoría; no implica autorización de entrega a producción.

## Interacciones y accesibilidad

- Estado de consulta separado de operación por producto. Bloqueo solo por tarjeta; las respuestas antiguas no resucitan productos ni contaminan otra sesión.
- Colección semántica y controles independientes. Móvil muestra Quitar además del icono.
- Eliminación optimista conserva snapshot y posición relativa ante rechazo; solo DELETE confirmado abre Deshacer. Un DELETE incierto se confirma repitiendo la operación idempotente antes del POST de restauración.
- Máximo tres avisos Deshacer visibles; el tiempo de los siguientes aún no corre. Pausa en foco/hover y durante restauración. Error crítico persiste hasta decisión del usuario.
- Avisos en región propia al final de la colección: no flotan encima de botones ni ocultan el estado vacío. No roban foco al aparecer.
- Foco a producto vecino o encabezado vacío tras retirar; restauración recupera el producto. Cerrar avisos devuelve foco a un encabezado estable.
- Errores con `alert`, progreso/confirmaciones con `status`, contador anunciado, movimiento reducido y objetivos táctiles de al menos 44 px.
- No existen favoritos/token/snapshots en localStorage. La clave de movimiento vive en memoria del intento; un resultado incierto se comprueba con la misma clave.

## Marco y fidelidad visual

Solo `/favoritos` y vistas de `/demo/h3/favoritos/lista` usan la cabecera compacta, marco beige y Roboto Condensed/Inter de Figma. Las demás rutas conservan Header/Footer y comportamiento anterior. La búsqueda reutiliza SearchBox; no propaga el selector de escenarios al catálogo. No se representa la barra de estado de iOS como UI web.

Para contraste AA se usa el naranja oscuro del token existente `--action-hover` en botones activos con texto blanco y enlaces pequeños; el naranja de Figma permanece en iconos y acentos. El aviso Deshacer ocupa una región propia en el flujo para no cubrir los controles.

Recursos originales locales y hashes: `public/figma/favorites-manifest.json`. Imágenes de productos continúan siendo props. Los ejemplos no prometen talla guardada, unidades de stock, envío, reserva de veinte minutos o porcentajes ficticios. El marco es de ejemplo en la demo: no cambia la identidad real ni inventa nombre del usuario.

## Verificación

Validación de esta entrega: build de producción correcto; 46 pruebas de componentes/controlador y 45 de handlers aprobadas; 10 E2E de interfaz aprobadas, más una regresión específica de eliminar/deshacer un producto agotado. Se revisaron capturas de escritorio y móvil sin desbordamientos. La aserción E2E de bloqueo del sandbox en producción pasó, pero su proceso no terminó durante la limpieza y se interrumpió; no se acredita esa ejecución como cierre limpio. La integración contra los nuevos endpoints reales continúa pendiente.

```powershell
npm run typecheck
npm run lint
npm run test:components
npm run test:server
npm run test:e2e:favorites:ui
npm run build
npm run test:e2e:wishlist:production
```

La suite de vistas puede reutilizar el Next local de 3200; sin uno inicia el servidor de prueba con sandbox. No ejecuta ni limpia Docker/PostgreSQL. Pruebas de controlador verifican carreras, DELETE incierto, restauración, aislamiento, claves repetidas y snapshots concurrentes. Handlers verifican flags, origen, sesión, sanitización, redirecciones y DTO. E2E de vistas usa adaptadores simulados e intercepta HTTP solo para probar el contenedor autenticado.

Para acreditar integración nueva falta entregar endpoints, homologar DTO/identidad/idempotencia, activar flags y ejecutar E2E conectado sin interceptar HTTP sobre base de prueba. La prueba histórica `npm run test:e2e` depende de `src/server.js` del backend, que no está en la rama actual; no se usa como gate global de este corte.
