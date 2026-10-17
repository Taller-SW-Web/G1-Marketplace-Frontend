# Evidencia individual — Diego — Frontend H3 — F-036/F-038

Evidencia histórica del corte conectado original, anterior a la ampliación de vistas y la integración de develop. Resultados y límites vigentes: [PR-DIEGO-FRONTEND.md](PR-DIEGO-FRONTEND.md) y [FAVORITOS-VISTAS.md](../../FAVORITOS-VISTAS.md). No acredita GET ni movimiento al carrito reales.

Fecha: 16/10/2026. Windows / PowerShell; Node 24.16.0, npm 11.13.0, Next 16.4.1, React 19.3.1, Edge, Docker Desktop / PostgreSQL 16 temporal.

Rama: `feat/s1-f036-f038-frontend`, desde `origin/develop`. Commit base: `0f47537ee12c25194817f7682be84500a62dde1c`. Cambios locales sin commit/push/PR publicado. El prompt local previo se conserva. Revisor principal: Fernando Saire; revisión humana y coordinación de cambios compartidos pendientes. No se enviaron mensajes a terceros ni se modificaron fuentes del backend o SPECS.

## Fuentes y trazabilidad

TASK-F036-FE-001, TASK-F038-FE-001, TASK-F036-QA-001, TASK-F038-QA-001. Se consultaron paquete vigente de implementación de Diego, matriz 0.2.0, guía colaborativa, funcional/UI/API/React F-036/F-038, O-003/O-006, gates G-AUTH/I-01/G-UNDO, guías de componentes y estilos existentes. El paquete histórico de diseño PAQUETE-DIEGO no sustituye la asignación actual de favoritos.

Contrato backend/OpenAPI H3 0.1.0, guía de uso, plan y evidencia individual del backend consultados. Tras instalar dependencias se leyeron las guías locales de Next en `node_modules/next/dist/docs`: Route Handlers, cookies, Server/Client Components y referencia route. El fallback oficial inicial y decisiones locales están en [guía de implementación](../../H3-DIEGO-FRONTEND.md).

## Implementación y clasificación

- **REAL local:** demo accesible, handlers Next, cliente/contexto, llamadas a NestJS y filas PostgreSQL comprobadas desde el harness.
- **MOCK:** clientes A/B, JWT sandbox y elegibilidad PRD-1/INACTIVE/MISSING/UNAVAILABLE. La suite HTTP interceptada es MOCK y se reporta por separado.
- No existe integración homologada con Seguridad/Productos, publicación o cierre del H3 común. F-036/F-038 conservan el objetivo S2 y sus tareas oficiales no se cerraron.

Route Handlers POST/DELETE preservan 201/200/204, validan producto/DTO y derivan identidad exclusivamente del servidor. Timeout 8s, no-store, sin redirecciones y errores públicos saneados. Sesión opaca HttpOnly/SameSite, memoria por proceso y rechazo de producción. Estado desconocido sin GET, confirmaciones posteriores a HTTP, bloqueo por producto, limpieza A/B y descarte de respuestas tardías. Timeout conserva el último corazón conocido con aviso de incertidumbre y sin aria-pressed que afirme estado actual.

ProductCard mantiene enlace y DTO; control hermano del Link. Se reutilizan Button, tokens y shell existentes. Demo independiente `/demo/h3/favoritos`, dos controles PRD-1 sincronizados, escenarios negativos y acciones explícitas para probar idempotencia. Aviso local basado en O-003, sin enlaces ficticios a login. Sin Deshacer: G-UNDO permanece abierto.

## Verificación ejecutada

| Comando / prueba | Resultado observado |
|---|---|
| `npm ci` | Aprobado: 209 paquetes, audit de instalación reportó 0 vulnerabilidades |
| `npm run typecheck` | Aprobado |
| `npm run lint` | Aprobado sin warnings |
| `npm run test:components` | 27 pruebas aprobadas: 10 existentes + 17 de favoritos |
| `npm run test:server` | 34 pruebas aprobadas en Node |
| `npm run build` | Compilación y generación de rutas aprobadas |
| `npm run test:e2e:wishlist` | 4 pruebas Edge aprobadas; HTTP interceptado MOCK |
| `npm run test:e2e:wishlist:connected` | 1 prueba Edge aprobada, sin interceptar HTTP; Next → Nest → PostgreSQL temporal |
| `npm run test:e2e:wishlist:production` | 1 prueba Edge aprobada; demo y GET/POST sesión, POST/DELETE favoritos denegados con 404 aun con flag true; controles ausentes |
| `node node_modules/@playwright/test/cli.js test --config playwright.config.ts` | Bloqueado antes de ejecutar casos: MODULE_NOT_FOUND para backend/src/server.js, dependencia histórica ausente |
| `git diff --check` | Aprobado |

Inspección adicional de `.next/static` con rg --no-ignore: sin coincidencias de nombres de variables JWT/secret ni marcadores de credenciales de pruebas. Las pruebas verifican también que la respuesta/cookie de sesión no contenga los JWT. Se cubren identificadores de producto que coinciden con claves heredadas de JavaScript y rechazo de códigos de error heredados, para no inferir estado ni mensajes desde el prototipo de objetos.

No se declara regresión global aprobada: `npm test` incluye la infraestructura antigua de catálogo. No se sustituyó su backend por interceptaciones ni se alteró silenciosamente su contrato. El build se verifica sin un servidor dev activo: un intento concurrente encontró archivos de tipos generados ausentes; se corrigió la secuencia y se repitió de forma aislada.

Hallazgos corregidos y repetidos: comparación de origen fallaba por normalización de loopback en NextURL; se fijó H3_FRONTEND_ORIGIN explícito con igualdad estricta y prueba negativa de Forwarded. Tab del diálogo se contiene explícitamente. La primera prueba conectada falló al cargar import.meta en el harness CommonJS; se corrigió la resolución de ruta y pasó. No fueron fallos de persistencia backend. npm inicial sin acceso a caché falló; instalación autorizada fuera del sandbox pasó. No se ocultaron resultados iniciales.

### Flujo conectado observado

PostgreSQL temporal `marketplace_h3_test`, compose de pruebas del backend, puerto 55432; Nest 10200 y Next development 3200. Migración existente aplicada mediante prisma migrate deploy. Sin base compartida/de desarrollo, sin migrate reset ni eliminación de volúmenes. Preparación automatizada elimina únicamente PRD-1 de los UUID ficticios A/B.

| Acción desde UI / harness | HTTP observado | Comprobación PostgreSQL |
|---|---|---|
| Sin sesión: botón abre aviso; llamada negativa explícita comprueba servidor | Sin POST por el botón; 401 en llamada negativa | Cero filas PRD-1 A/B |
| A guarda PRD-1 | 201 | Una fila de A |
| A repite POST | 200 | Sigue una fila de A |
| Recargar UI | Estado desconocido, sin GET inventado | La fila de A permanece |
| B elimina PRD-1 antes de guardarlo | 204 | La fila de A permanece |
| B guarda PRD-1 | 201 | Una fila A y una B |
| B elimina; A elimina y repite DELETE | 204 / 204 / 204 | Cero filas finales PRD-1 A/B |
| PRD-INACTIVE / PRD-MISSING / PRD-UNAVAILABLE | 404 / 404 / 503 | Ningún guardado confirmado por la UI |

La aplicación frontend no accede a Prisma ni a DB. La consulta controlada de filas se realiza exclusivamente desde el harness y el contenedor de prueba. Traces/videos desactivados. Credenciales generadas en memoria, no impresas, versionadas ni incluidas en capturas.

## Evidencia visual y repetición

- [Captura desktop conectada, 1440 px](favoritos-conectado-1440.png).
- [Captura mobile conectada, 390 px](favoritos-conectado-390.png).

Ambas capturas se generaron durante el flujo real con A guardado y dos controles sincronizados; fueron abiertas y revisadas visualmente. Reflow automatizado adicional a 320 px, controles de 44 px mínimo y teclado/Escape/foco comprobados en Edge. No sustituyen evaluación con lector de pantalla ni aprobación de frames Figma; la aceptación visual humana sigue pendiente. El indicador de desarrollo Next visible pertenece al entorno development requerido por el sandbox.

Reproducir con `npm run test:e2e:wishlist:connected`. Para demostración interactiva, `npm run demo:h3` y abrir **http://127.0.0.1:3200/demo/h3/favoritos**; Ctrl+C detiene los procesos iniciados. Puertos deben estar libres; no se reutilizan servidores ajenos. El runner deja PostgreSQL temporal disponible para inspección. Configuración manual, comandos DB y apagado en [guía](../../H3-DIEGO-FRONTEND.md).

## Limitaciones y revisión

Sin GET no se conoce el estado inicial ni se restaura desde localStorage. Memoria de sesión local, expira en 15 minutos máximo y se pierde con reinicios; JWT backend también expira a los 15 minutos y requiere regeneración, sin refresh. No lista F-037, auth real, movimientos a carrito ni O-006 completo. DELETE de IDs literales punto/punto-punto se rechaza por normalización de segmentos URL; excepción de transporte registrada para homologación, sin cambiar IDs o backend. Frames de O-003/O-006 no se presentan como aprobados.

IA: Codex; variante exacta de modelo no registrada. Propósito: implementar el plan aprobado, generar/adaptar sesión, transporte, estado, controles, pruebas, runner y documentación. Prompt principal: «Implement the plan». Código generado/adaptado revisado técnicamente mediante lectura, pruebas y ejecución conectada; se corrigieron los hallazgos descritos. Revisión humana de Diego/Fernando y validación de contratos/seguridad por Leonidas/Andres pendientes. No se atribuye aprobación humana realizada.

Borrador de PR local: [PR-DIEGO-FRONTEND.md](PR-DIEGO-FRONTEND.md). Publicación, commits y revisión independiente permanecen pendientes; los gates G-AUTH/I-01/G-UNDO y la aceptación académica H3 no se cierran con esta demo.
