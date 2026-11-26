# QA y trazabilidad de Diego — Frontend — 03/11/2026

Alcance: issues asignadas a DiesmEsp. Este documento actualiza evidencia local; no acredita integración REAL, aprobación independiente ni cierre.

PR principal: [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118). PR complementario: [Frontend #118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118) / [Backend #239](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/pull/239).

## Validación local de los puntos 1–5

| Control | Resultado actual | Límite |
|---|---|---|
| Frontend componentes / BFF | 257 / 111 aprobados | Proveedores controlados; no son pruebas externas REAL. |
| UI favoritos/CSAT | 17 E2E aprobados | Incluye logout, Escape, motivos, borrador, duplicado, XSS en texto y responsive 1440/390/320; demo/DTO controlados. |
| E2E navegador→Next→Nest→PostgreSQL | 7 aprobados | Identidad/catálogo controlados, Ventas/Postventa loopback y SHOWN fixture. |
| Backend unitarias / HTTP | 229 / 225 aprobados | 17 HTTP omitidas por entorno; 13 de sesiones se ejecutaron aparte. |
| PostgreSQL 16 temporal | 41 integración + 13 sesiones aprobadas | Cuatro migraciones; redeploy sin pendientes; contenedor propio eliminado. |
| Scripts auth/probe | 4 + 6 aprobados | Contratos locales; no certifican despliegue. |
| Build / typecheck / lint | Aprobados según repositorio | Frontend build incluye tipos; backend build/typecheck. |

La suite HTTP necesitó una DATABASE_URL ficticia local para arrancar; no se usó una base compartida. Los EPERM/SWC del sandbox se reintentaron con autorización. En la primera UI hubo un selector ambiguo de alertas y un timeout de navegación bajo carga; se corrigió el selector, los dos casos pasaron aislados y la ejecución final completa dio 17/17. Un intento del runner conectado chocó con el Next de UI; se repitió secuencialmente y pasó 7/7. No se suman intentos fallidos a los resultados aprobados.

## Fronteras que permanecen abiertas

No hay reviews registradas en los PR funcionales al corte. No se certificó G6/G7/G5 REAL, despliegue, DAST externo ni productor de prompt autorizado. F-039 conserva la decisión implementada de agregar sin quitar; la redacción FE/BE/SPECS requiere aceptación coherente. Los mocks no liberan gates. El trabajo no implementa sistemas asignados a otros integrantes.

No se cierra una issue por tener código, un PR o CI verde: deben cumplirse su corte y definición de terminado. Las revisiones de Fernando/Jim no se sustituyen por autorrevisión de Codex.

## Cómo repetir

Frontend: `npm run test:components`, `npm run test:server`, `node node_modules/@playwright/test/cli.js test --config playwright.diego-closure.config.ts`. El config usa puerto 3347 y servidor exclusivo; la suite queda excluida del Playwright predeterminado porque requiere sandbox.

Backend: `npm run test:unit`, `npm run test:e2e` con configuración local explícita y `npm run test:diego:isolated` con Docker. Desde frontend: definir H4_BACKEND_DIR hacia el candidato backend y ejecutar `npm run test:e2e:h4:connected`. Ejecutar los servidores Next sobre un mismo checkout de forma secuencial.


## Seguridad del corte

- SAST: 0 hallazgos/0 errores; 140 archivos src/scripts, cuatro reglas locales. No es una certificación OWASP exhaustiva.
- Gitleaks fuente: 0 hallazgos en snapshot de 345 archivos fuente/documentación/tests según Git, sin node_modules, cachés o .env privados.
- SCA total: 11 moderadas, 0 bajas, 0 altas/críticas. SCA runtime: 0 vulnerabilidades reportadas.
- Las moderadas de herramientas de desarrollo requieren análisis/aceptación; no se aplican downgrades mayores automáticos.
- DAST externo pendiente de entorno y ventana autorizados. El test XSS local no lo sustituye.
- Artefactos: backend dist sin hallazgos; Next contiene claves de build en metadatos privados que se clasifican por la política existente, sin publicar sus valores. Ver resumen sanitizado del artefacto del corte; no distribuir cachés ni reportes crudos.


## Mapa issue → PR → sección → código/prueba

Los enlaces son trazabilidad explícita. No se afirma que GitHub haya establecido una asociación nativa en Development. Se conservan las issues abiertas mientras falte su DoD; no se añaden palabras de cierre automático prematuro.

<a id="issue-103"></a>
### [#103](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/103) — TASK-TRANS-S04-QA-001

**Sección:** QA evento F-032/F-035. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [docs/QA-DIEGO-CIERRE-2026-11-03.md](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/docs/QA-DIEGO-CIERRE-2026-11-03.md)

**Avance:** Seguimiento documental y/o pruebas locales relacionadas; no se declara ejecutada la batería externa pendiente.

**Falta para cierre:** Faltan emisor/transporte/evento REAL, positivos/negativos/timeout/duplicado y revisión de Jim.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-102"></a>
### [#102](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/102) — TASK-TRANS-S03-QA-001

**Sección:** QA checkout y F-034 asíncrona. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [tests/checkout.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/checkout.spec.ts), [tests/components/checkout-recovery.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/checkout-recovery.test.tsx)

**Avance:** Seguimiento documental y/o pruebas locales relacionadas; no se declara ejecutada la batería externa pendiente.

**Falta para cierre:** Falta matriz completa del E2E asignado con datos/entorno de integración y F-034 asíncrona; los fixtures no cierran esta QA.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-97"></a>
### [#97](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/97) — TASK-TRANS-S01-QA-001

**Sección:** QA catálogo REAL en nube. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [tests/catalog.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/catalog.spec.ts)

**Avance:** Seguimiento documental y/o pruebas locales relacionadas; no se declara ejecutada la batería externa pendiente.

**Falta para cierre:** Falta batería REAL en nube de F-006/F-007 con positivo/vacío/error/timeout y revisión de Jim.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-96"></a>
### [#96](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/96) — TASK-F040-QA-001

**Sección:** Evaluación postentrega. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/csat/PostDeliveryFeedback.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/csat/PostDeliveryFeedback.tsx), [tests/diego-closure/csat.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/diego-closure/csat.spec.ts), [tests/h4-connected/flows.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/h4-connected/flows.spec.ts)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar. I-03/I-04/G-PROMPT y motivos/política de descarte sin homologación final; no se inventan transiciones durables.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-95"></a>
### [#95](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/95) — TASK-F040-FE-001

**Sección:** Evaluación postentrega. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/csat/PostDeliveryFeedback.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/csat/PostDeliveryFeedback.tsx), [tests/diego-closure/csat.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/diego-closure/csat.spec.ts), [tests/h4-connected/flows.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/h4-connected/flows.spec.ts)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar. I-03/I-04/G-PROMPT y motivos/política de descarte sin homologación final; no se inventan transiciones durables.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-94"></a>
### [#94](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/94) — TASK-F039-QA-001

**Sección:** Agregar al carrito conservando favorito. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/add-server.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/add-server.ts), [tests/server/favorites-cart-auth.test.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/server/favorites-cart-auth.test.ts), [tests/components/favorites-controller.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/favorites-controller.test.tsx)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar. Alinear FE mover/quitar con BE conservar favorito y aceptación SPECS #15.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-93"></a>
### [#93](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/93) — TASK-F039-FE-001

**Sección:** Agregar al carrito conservando favorito. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/add-server.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/add-server.ts), [tests/server/favorites-cart-auth.test.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/server/favorites-cart-auth.test.ts), [tests/components/favorites-controller.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/favorites-controller.test.tsx)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar. Alinear FE mover/quitar con BE conservar favorito y aceptación SPECS #15.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-92"></a>
### [#92](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/92) — TASK-F038-QA-001

**Sección:** Quitar y Deshacer. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/FavoritesController.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/FavoritesController.ts), [tests/components/favorites-controller.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/favorites-controller.test.tsx), [tests/wishlist/views.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/wishlist/views.spec.ts)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-91"></a>
### [#91](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/91) — TASK-F038-FE-001

**Sección:** Quitar y Deshacer. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/FavoritesController.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/FavoritesController.ts), [tests/components/favorites-controller.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/favorites-controller.test.tsx), [tests/wishlist/views.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/wishlist/views.spec.ts)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-90"></a>
### [#90](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/90) — TASK-F037-QA-001

**Sección:** Lectura de favoritos. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/FavoritesContent.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/FavoritesContent.tsx), [tests/components/favorites-controller.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/favorites-controller.test.tsx), [tests/wishlist/views.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/wishlist/views.spec.ts)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-89"></a>
### [#89](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/89) — TASK-F037-FE-001

**Sección:** Lectura de favoritos. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/FavoritesContent.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/FavoritesContent.tsx), [tests/components/favorites-controller.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/favorites-controller.test.tsx), [tests/wishlist/views.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/wishlist/views.spec.ts)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-88"></a>
### [#88](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/88) — TASK-F036-QA-001

**Sección:** Alta favorita. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/FavoriteToggle.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/FavoriteToggle.tsx), [tests/components/wishlist.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/wishlist.test.tsx)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.

<a id="issue-87"></a>
### [#87](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/87) — TASK-F036-FE-001

**Sección:** Alta favorita. **PR:** [#118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118).

**Fuentes:** [src/features/wishlist/FavoriteToggle.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/src/features/wishlist/FavoriteToggle.tsx), [tests/components/wishlist.test.tsx](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/diego-h4-frontend-validado/tests/components/wishlist.test.tsx)

**Avance:** Casos locales existentes reejecutados con fixtures/proveedores controlados; resultados por suite y límites en el reporte enlazado.

**Falta para cierre:** Revisión independiente y casos UI/API desplegados exigidos por la issue; integración REAL/gates aplicables sin acreditar.

**Decisión:** mantener abierta. No hay aprobación independiente registrada; tampoco evidencia desplegada/REAL completa ni justificación de no aplicabilidad para cerrar el DoD.
