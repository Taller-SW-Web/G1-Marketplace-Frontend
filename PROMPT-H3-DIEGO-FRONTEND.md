# Prompt de implementación — Frontend individual H3 de Diego

Implementa el frontend de la entrega individual H3 de Diego Espinoza: agregar y quitar favoritos, conectado al backend existente.

Trabaja en:
`D:\Proyectos\G1-Marketplace\G1-Marketplace-Frontend`

El backend está en:
`D:\Proyectos\G1-Marketplace\G1-Marketplace-Backend`

No modifiques el backend ni implementes funcionalidades ajenas a este corte. Debes producir código, pruebas y documentación; no te limites a proponer un plan.

## 1. Objetivo y límites

Entregar una demostración visual donde Diego pueda:

1. Activar una identidad ficticia de sandbox.
2. Agregar un producto a favoritos mediante el backend.
3. Ver el estado confirmado por el servidor.
4. Quitar el favorito mediante el backend.
5. Demostrar rechazo sin sesión y manejo de errores.
6. Mostrar pruebas y evidencia de persistencia real en PostgreSQL.

Clasificación:

- UI, HTTP hacia Marketplace y persistencia PostgreSQL: reales locales.
- Identidad y elegibilidad de Productos: MOCK.
- No presentar este flujo como autenticación real con Seguridad ni integración real con Productos.
- La entrega sigue siendo un avance preparatorio H3.

Fuera de alcance:

- Listado completo F-037 y página completa de favoritos.
- Registro/login/MFA reales.
- Carrito, checkout, movimientos entre carrito y favoritos.
- Evaluación postentrega.
- Despliegue, push, merge o publicación automática.

## 2. Leer antes de programar

Lee AGENTS.md del frontend y respeta sus instrucciones. La versión instalada de Next.js exige consultar su documentación local disponible en `node_modules/next/dist/docs/` antes de utilizar APIs; si no está disponible, consulta documentación oficial compatible con la versión instalada.

Lee también:

Backend:

- `PLAN-H3-DIEGO-BACKEND.md`
- `docs/H3-DIEGO-USO.md`
- `docs/contratos/h3-favoritos.md`
- `docs/contratos/openapi-h3.json`
- `docs/evidencias/h3/diego-backend.md`

Repositorio hermano G1-Marketplace-SPECS:

- Paquete individual de Diego.
- Guía de trabajo colaborativo.
- Matriz vigente de responsabilidades.
- Specs funcionales, API, UI y componentes React de F-036 y F-038.
- O-003: autenticación requerida.
- O-006: deshacer eliminación.
- Decisiones/bloqueos G-AUTH, I-01 y G-UNDO.

Las antiguas SPEC-01–SPEC-08 son antecedentes históricos. El reparto vigente usa F-001–F-040.

## 3. Estado actual que debes verificar

El frontend ya tiene:

- Next.js App Router, React y TypeScript.
- Catálogo y ProductCard.
- Componentes compartidos en `src/shared/ui/`.
- Tokens visuales y estilos existentes.
- Vitest, Testing Library y Playwright.
- `MARKETPLACE_API_URL` como variable exclusiva del servidor.
- Un proxy de catálogo en `src/app/api/catalog/[...path]/route.ts`.

Inspecciona el estado real antes de editar:

- Conserva cambios locales.
- Reutiliza componentes y estilos existentes.
- No reinstales el proyecto ni cambies de framework.
- No introduzcas otra biblioteca UI o un gestor de estado nuevo sin necesidad.
- Revisa develop y la política de ramas; prepara una rama de trabajo revisable sin sobrescribir trabajo ajeno.

Advertencia: la configuración Playwright inspeccionada utiliza el antiguo backend `src/server.js` y rutas de catálogo. El backend de favoritos ahora usa NestJS/`dist/main.js`. Comprueba esta incompatibilidad antes de ejecutar pruebas; no presentes fallos de infraestructura heredada como fallos de favoritos ni alteres silenciosamente las pruebas de catálogo.

## 4. Contrato del backend que debes consumir

Base configurable server-only:

```text
MARKETPLACE_API_URL=http://127.0.0.1:10000
```

### Agregar

```http
POST /api/v1/wishlist/items
Authorization: Bearer <JWT sandbox>
Content-Type: application/json

{"productId":"PRD-1"}
```

Cuerpo estricto; respuestas:

- 201: creado.
- 200: ya existía.
- Ambos devuelven `{"productId":"PRD-1"}`.

### Quitar

```http
DELETE /api/v1/wishlist/items/{productId}
Authorization: Bearer <JWT sandbox>
```

Respuesta:

- 204 sin cuerpo, tanto si se eliminó como si ya estaba ausente.

No intentes parsear JSON después de un 204.

### Errores

Formato:

```json
{"code":"...","message":"..."}
```

- 400 INVALID_PRODUCT_ID
- 400 INVALID_REQUEST
- 401 UNAUTHORIZED
- 404 PRODUCT_NOT_AVAILABLE
- 503 CATALOG_UNAVAILABLE
- 500 INTERNAL_ERROR

Reglas:

- Nunca enviar customerId al backend.
- productId es referencia textual, no SKU ni UUID obligatorio.
- Longitud de 1–100 caracteres, sin espacios exteriores ni controles.
- No transformar capitalización ni recortar silenciosamente.
- DELETE no requiere consultar Productos.

Fixtures disponibles:

- PRD-1: activo.
- PRD-INACTIVE: inactivo.
- PRD-MISSING: inexistente.
- PRD-UNAVAILABLE: simula proveedor no disponible.
- Otros IDs no están disponibles para el adaptador MOCK.

Importante: actualmente NO existe GET de favoritos. No inventes esa ruta, no simules una consulta exitosa ni deduzcas persistencia desde localStorage.

## 5. Tarea FE-01 — Preparar base y registrar alcance

- Inspecciona componentes, estilos, scripts y pruebas actuales.
- Registra rama y commit base.
- Identifica los puntos compartidos que modificarás.
- Crea una guía local de implementación y avance.
- Relaciona el trabajo con:
  - TASK-F036-FE-001
  - TASK-F038-FE-001
  - TASK-F036-QA-001
  - TASK-F038-QA-001
- No cierres las tareas oficiales ni cambies su semana objetivo por completar este prototipo.

Aceptación: el alcance y las dependencias quedan claros antes de modificar componentes.

## 6. Tarea FE-02 — Transporte seguro mediante Next.js

Implementa Route Handlers propios del frontend:

```text
POST /api/wishlist/items
DELETE /api/wishlist/items/{productId}
```

Estos handlers llaman al backend NestJS correspondiente.

Requisitos:

- MARKETPLACE_API_URL permanece server-only.
- Construir destinos únicamente desde la base configurada y rutas fijas.
- No aceptar URLs arbitrarias, customerId o Authorization del navegador como fuente de identidad.
- Obtener la credencial del contexto de sesión de servidor.
- Validar cuerpo y parámetros antes de reenviar.
- Encodear productId correctamente.
- Usar no-store tanto en solicitudes como respuestas privadas.
- Aplicar timeout acotado y no seguir redirecciones del proveedor.
- Reenviar correctamente 201, 200 y 204.
- Validar runtime del DTO de éxito: productId debe coincidir con el solicitado.
- Mapear errores conocidos a mensajes públicos.
- No reenviar stack traces, HTML, cabeceras sensibles o errores crudos.
- Un timeout debe mostrarse como resultado incierto, no como éxito ni ausencia confirmada.

El navegador llama al mismo origen Next.js; no necesita conectarse directamente al puerto del backend.

Aceptación: los contratos se preservan y ninguna credencial aparece en el bundle o en respuestas al navegador.

## 7. Tarea FE-03 — Sesión de sandbox aislada

Primero comprueba si existe una integración de sesión vigente que puedas reutilizar.

Si no existe, implementa exclusivamente un mecanismo local de demo:

- Habilitación explícita mediante `H3_FRONTEND_SANDBOX_ENABLED=true`.
- Permitido solo en development/test.
- Denegado en producción.
- Credenciales A/B generadas por el comando del backend:

```text
npm run --silent sandbox:token -- --customer A
npm run --silent sandbox:token -- --customer B
```

- Cargar estos tokens en variables server-only del frontend:
  - H3_SANDBOX_TOKEN_A
  - H3_SANDBOX_TOKEN_B
- Nunca copiar el secreto H3_JWT_SECRET al frontend.
- Nunca generar JWT en el navegador.
- No usar NEXT_PUBLIC para secretos.
- No persistir tokens en localStorage, sessionStorage, URLs o props.

Para la demo:

- Permitir seleccionar “Sin sesión”, “Cliente de prueba A” y “Cliente de prueba B”.
- Identificarlo visiblemente como simulación de sesión.
- Usar una sesión opaca HttpOnly, SameSite y con Secure cuando corresponda.
- La asociación a los tokens permanece exclusivamente en servidor.
- Puede ser efímera y en memoria para esta demo local; documentar que se pierde al reiniciar el servidor y que no sirve para despliegue distribuido.
- No crear una sesión autenticada de producción.
- Proteger las mutaciones de sesión y favoritos contra solicitudes cross-site mediante verificación estricta de origen.
- Retornar al cliente solo estado no sensible y un ámbito de sesión opaco.
- Al cambiar identidad, limpiar estado privado y cancelar/ignorar respuestas de la identidad anterior.
- Un 401 por token vencido limpia el estado y solicita renovar la sesión de prueba; no inventar refresh.

Como rutas locales de sandbox puedes usar:

```text
GET/POST /api/h3/session
```

Estas rutas solo administran la demo frontend; no son endpoints de Seguridad ni cambios del contrato backend.

Aceptación: A y B tienen estados separados; el usuario puede demostrar el rechazo sin sesión; los controles de sandbox no funcionan ni se muestran en producción.

## 8. Tarea FE-04 — Cliente tipado y estado compartido

Crear `src/features/wishlist/` con:

- Tipos de solicitudes/respuestas/errores.
- Cliente HTTP.
- Hooks/contexto para mutaciones y estado por producto.
- Componentes presentacionales separados del transporte.

No instalar TanStack Query o Zustand solo porque aparecen como propuestas en SPECS. Reutilizar lo existente; React Context y hooks son suficientes para este corte si no existe una solución compartida.

Estado:

- Por identidad y productId.
- Inicial desconocido.
- Guardando.
- Guardado confirmado.
- Eliminando.
- No guardado confirmado.
- Autenticación requerida.
- Producto no disponible.
- Error.
- Resultado incierto por timeout.

Como no existe GET:

- No presentar el estado inicial como “no guardado” confirmado.
- Inicialmente puede ofrecerse la acción idempotente “Guardar en favoritos”.
- Omitir aria-pressed hasta conocer el estado; después usar true/false confirmado.
- Tras recarga, no reconstruir favoritos desde almacenamiento local.
- No anunciar que se cargó una lista del servidor.
- Documentar esta limitación del corte.

Coherencia:

- Dos controles del mismo producto usan la misma fuente de estado.
- Serializar mutaciones por producto.
- Doble clic no dispara dos operaciones.
- Una respuesta de la sesión anterior no actualiza la nueva.
- No reintentar mutaciones automáticamente.
- Permitir recuperación manual apoyándose en la idempotencia existente.
- Un error o timeout no debe cambiar el corazón a un estado confirmado falso.

Aceptación: los componentes reflejan confirmaciones del backend y no mantienen fuentes de verdad duplicadas.

## 9. Tarea FE-05 — FavoriteToggle accesible

Crear FavoriteToggle con props tipadas equivalentes a:

- productId
- Estado confirmado/desconocido
- busy
- authenticated
- onSave
- onRemove
- onRequireAuth

Comportamiento:

- “Guardar en favoritos” cuando corresponde guardar.
- “Quitar de favoritos” tras guardado confirmado.
- Progreso local mientras se procesa.
- Deshabilitar acciones repetidas.
- 201 y 200 significan guardado confirmado.
- 204 significa eliminación confirmada.
- Anunciar resultados mediante regiones status/alert.
- No depender exclusivamente del color.

Accesibilidad:

- Botón semántico.
- Nombre accesible.
- aria-pressed cuando el estado es conocido.
- Foco visible y navegación por teclado.
- Área táctil mínima 44 px.
- Movimiento reducido.
- Contraste acorde al sistema visual existente.

Aceptación: funciona con teclado, lector de pantalla y doble pulsación sin duplicar operaciones.

## 10. Tarea FE-06 — Integrar sin romper catálogo

ProductCard actualmente contiene un Link envolviendo imagen e información.

Integra el control como hermano del Link, nunca como botón dentro del enlace. El clic en favoritos no debe navegar a la ficha. El enlace de producto debe conservar su comportamiento.

Reutiliza estilos, tokens y componentes existentes; evita rediseñar catálogo, header o footer.

Importante:

- Los productos reales del catálogo pueden tener IDs distintos de PRD-1.
- No renombres esos IDs ni los traduzcas todos a PRD-1 para fabricar integración.
- El backend MOCK rechaza IDs desconocidos y debe mostrarse honestamente.

Entrega un espacio de demostración local independiente, por ejemplo `/demo/h3/favoritos`:

- Solo disponible con sandbox habilitado en development/test.
- Aviso visible de simulación.
- Producto ficticio PRD-1 con datos visuales explícitamente de prueba.
- Selector de identidad.
- Dos instancias del control sobre PRD-1 para demostrar sincronización.
- Controles o escenarios de PRD-INACTIVE, PRD-MISSING y PRD-UNAVAILABLE.
- No presentarlo como página F-037 ni listado personal real.

La demostración debe funcionar aunque el catálogo backend de otro compañero no esté disponible. No añadir rutas de catálogo al backend para resolver esa dependencia.

Aceptación: hay un flujo visual reproducible con el backend actual y una integración reusable en ProductCard, sin falsear datos externos.

## 11. Tarea FE-07 — Sin sesión y errores

Sin sesión:

- No enviar POST de favorito desde el navegador.
- Abrir O-003 o el patrón accesible existente para autenticación requerida.
- Explicar la acción y permitir cancelar.
- Restituir foco al botón invocador.
- Conservar solo intención mínima no sensible.

Si existe login real, usar únicamente una ruta interna validada. Si todavía no existe:

- No crear un enlace roto.
- No fabricar autenticación real.
- En la demo, explicar que se utiliza el selector de sesión simulada.

Mensajes específicos:

- 400: solicitud/producto inválido.
- 401: sesión requerida o vencida.
- 404: producto no disponible; no marcar guardado.
- 503: servicio temporalmente no disponible.
- 500: fallo del servicio sin detalles técnicos.
- Timeout: no se pudo confirmar el resultado.

No sustituir estos errores por una lista vacía o una notificación de éxito.

Aceptación: cada escenario tiene una recuperación comprensible y un estado accesible correcto.

## 12. Tarea FE-08 — Quitar y posible restauración

El núcleo obligatorio H3 es quitar con DELETE confirmado:

- Mantener estado previo mientras se procesa.
- Actualizar al recibir 204.
- Conservar o recuperar foco.
- Si falla, no mostrar eliminación confirmada.

G-UNDO sigue abierto:

- No prometer “Deshacer” garantizado.
- No cerrar F-038 completa por este prototipo.
- Documentar que O-006 completo depende de validación del equipo.

Si implementas una recuperación de demo:

- Debe ser un nuevo POST explícito después de DELETE confirmado.
- Volver a comprobar elegibilidad mediante el backend.
- Puede fallar con 404/503.
- No restaurar visualmente antes de éxito.
- No afirmar que recupera fecha/posición originales.
- Etiquetarla como recuperación experimental del sandbox y documentarla.

No inventar endpoint de restauración.

## 13. Tarea FE-09 — Pruebas de componentes y handlers

Usar Vitest y Testing Library existentes.

Cubrir:

- Estado inicial desconocido.
- Guardando y guardado confirmado por 201/200.
- Doble clic: una mutación.
- Eliminando y eliminado por 204.
- DELETE no intenta parsear JSON.
- 400/401/404/503/500 y timeout.
- Sin sesión: no POST, apertura y cierre accesible del aviso.
- Dos controles del mismo producto sincronizados.
- Cambio A/B: no filtrar estado entre identidades.
- Respuesta antigua ignorada tras cambio de sesión.
- Botón independiente del Link.
- Nombres accesibles, aria-pressed y foco.
- Estado local no persistido como favoritos reales.

Handlers:

- No aceptar customerId ni Authorization arbitrario del navegador.
- No exponer tokens.
- No-store.
- Validación del origen.
- Timeout/respuesta inesperada sanitizados.
- Sandbox denegado en producción.
- 204 sin cuerpo.

## 14. Tarea FE-10 — Pruebas visuales y extremo a extremo

Preparar configuración Playwright específica de favoritos, sin depender de los antiguos endpoints de catálogo.

El sandbox está bloqueado en producción:

- Para E2E sandbox, ejecutar Next en modo development en un puerto exclusivo.
- Verificar build de producción por separado.
- No desactivar la protección de producción para facilitar pruebas.

Distinguir:

1. Pruebas frontend con respuestas HTTP interceptadas: MOCK.
2. Navegador → Next → NestJS → PostgreSQL: integración local real, con identidad/elegibilidad MOCK.

Prueba conectada:

- Levantar PostgreSQL temporal y aplicar migraciones siguiendo la guía backend.
- Compilar/arrancar NestJS sandbox.
- Configurar tokens de prueba server-only en Next.
- Desde la UI, guardar PRD-1.
- Comprobar persistencia usando el mecanismo de pruebas o consulta controlada del backend, nunca acceso a Prisma desde la aplicación frontend.
- Quitar y comprobar ausencia.
- Demostrar A/B y rechazo sin sesión.
- Evitar conservar tokens o datos sensibles en traces, screenshots o logs.

Verificar desktop y móvil, teclado y foco. Registrar cualquier fallo preexistente de catálogo por separado; no declarar una regresión global aprobada si no se ejecutó correctamente.

## 15. Tarea FE-11 — Documentación y evidencia individual

Crear `docs/evidencias/h3/diego-frontend.md` con:

- Fecha, entorno, rama y commit base.
- IDs de tareas y specs consultadas.
- Cambios realizados.
- Configuración sin secretos.
- Comandos y resultados reales.
- Capturas desktop/mobile.
- Evidencia de UI conectada a NestJS/PostgreSQL.
- Clasificación MOCK/REAL de cada dependencia.
- Limitaciones por falta de GET, auth real y G-UNDO.
- IA utilizada, código generado y revisión humana pendiente/realizada.
- Revisor principal: Fernando Saire.
- Instrucciones para repetir la demostración.

Actualizar `.env.example` con nombres de variables y valores vacíos para credenciales. No subir `.env` ni tokens.

Preparar una descripción de PR hacia develop. No hacer push, publicar o fusionar automáticamente.

## 16. Verificación final

Ejecutar los comandos pertinentes existentes:

```text
npm ci
npm run typecheck
npm run lint
npm run test:components
npm run build
```

Además:

- E2E específico de favoritos.
- Regresión existente cuando su infraestructura esté disponible.

No marcar una prueba como aprobada sin ejecutarla. No ocultar fallos ni sustituir una prueba conectada por interceptaciones.

Al finalizar, entregar:

1. Resumen de cambios.
2. Archivos principales.
3. Comandos y resultados.
4. Cómo iniciar frontend y backend para la demo.
5. URL local de demostración.
6. Evidencia generada.
7. Pendientes externos y revisión humana.

Criterio final: Diego puede demostrar desde una UI accesible que guardar/quitar modifica realmente PostgreSQL mediante NestJS, sin exponer credenciales, sin duplicados visuales y sin presentar mocks como integraciones externas reales.
