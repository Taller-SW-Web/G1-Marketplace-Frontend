# Evidencia — FE #98: E2E del segundo demo

> Estado: **avance preliminar; E2E integral pendiente**. Los datos siguientes registran sólo las comprobaciones efectuadas hasta ahora y no certifican #98 completa.

## Identificación

- Issue: [TASK-TRANS-S02-QA-001 — Frontend #98](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/98)
- Rama: `test/fe98-e2e-segundo-demo-fernando`
- Commit SHA de implementación E2E: `8f4fab6`
- PR hacia `develop`: pendiente
- Fecha/hora de ejecución (America/Lima): pendiente
- Responsable / revisor: Fernando Saire / Jim Segovia

## Entorno del recorrido unificado FE #98

- SO / versión Node / navegador: Windows local, Node `v22.20.0`, Playwright `1.64.1`, Chromium mediante canal Microsoft Edge
- Comando Playwright y configuración: `npx playwright test --config playwright.fe98.config.ts`
- Backend/BFF local y puertos: Backend en `127.0.0.1:10110`, Frontend Next en `127.0.0.1:3210`; catálogo `CATALOG_SOURCE=mock`
- Servidor de autenticación mock: este recorrido usa estado H3 y APIs de carrito/favoritos stubbeadas en navegador; la prueba de autenticación integrada usa `scripts/g7-contract-fixture.mjs` local en puerto 4012.
- Base de datos/almacenamiento de test, si aplica: el recorrido principal no usa DB; la prueba integrada de auth usó PostgreSQL 16 desechable `g1_auth_h4_test` en tmpfs, puerto 55435, destruida al terminar.
- Servicios externos contactados: **ninguno previsto**

## Clasificación de dependencias

| Módulo | Clasificación | Fuente/configuración | Resultado |
|---|---|---|---|
| Catálogo G6 | MOCK | En la prueba preliminar, respuesta de `page.route`; no G6 real | Parcial |
| Frontend G1 | LOCAL | Next.js levantado por Playwright | Pendiente |
| Backend/BFF G1 | LOCAL | API local levantada por Playwright | Pendiente |
| Auth G7 | LOCAL con fixture de contrato | `scripts/g7-contract-fixture.mjs`, BFF local y PostgreSQL desechable; sin G7 real ni correo | Integración local aprobada |
| Carrito | MOCK en la prueba preliminar | Interceptaciones `page.route`; no API local validada por ese caso | Parcial |
| Favoritos | LOCAL/MOCK según ruta probada | Completar tras revisar interceptaciones | Pendiente |
| G5, G6, G7 productivos / correo | NO PROBADOS | Fuera del alcance de esta ejecución | No probado |

## Casos y resultados

| Caso | Resultado esperado | Resultado observado | Evidencia / trace | Estado |
|---|---|---|---|---|
| Catálogo con etiqueta MOCK | Productos fixture visibles, sin atribuir integración real a G6 | Catalog API local del Backend en modo MOCK; etiqueta visible | `fe98-second-demo.e2e.spec.ts` | Parcial: MOCK local |
| Ficha de producto | Fixture correcto; caso desconocido neutral | Tarjeta de catálogo abre su ficha sincronizada; contenido indica MOCK | `fe98-second-demo.e2e.spec.ts`; `product-detail.e2e.spec.ts` | Parcial |
| Añadir/consultar/quitar carrito | Cambios reflejados en el carrito local de test | Agrega producto y lo encuentra en `/carrito`; la API se intercepta en navegador | `fe98-second-demo.e2e.spec.ts` | Parcial: stub UI |
| Agregar/listar/quitar favorito | Aislamiento y estado esperado | Guarda desde tarjeta, lo muestra en `/favoritos` y lo quita; API se intercepta en navegador | `fe98-second-demo.e2e.spec.ts` | Parcial: stub UI |
| Autenticación UI positiva con fixture G7 | Sesión sintética sólo después de verificar OTP válido | MFA→favoritos→recarga→segunda pestaña→logout; login móvil, **3/3** | `g7-local.spec.ts`; `fe98-g7-auth-negative.spec.ts` | Aprobado local |
| JWT vencido | Ruta protegida rechaza; sesión no se recupera si falla refresh | Backend fuerza `accessExpiresAt=0`; suite de expiración/refresh **18/18** | Backend `test/auth-g7.e2e-spec.ts` | Aprobado Backend; no navegador FE |
| Ownership entre identidades | Usuario A no consulta/modifica recursos de B | Filas persistidas A/B; propiedad y aislamiento comprobados, suite **18/18** | Backend `test/auth-g7.e2e-spec.ts` | Aprobado Backend; no navegador FE |
| MFA inválido/expirado y permitido | OTP incorrecto no crea sesión; válido sí; desafío vencido rechazado | OTP incorrecto dejó sesión anónima; válido completó el flujo; Backend cubre desafío expirado, **3/3 FE + 18/18 BE** | FE `fe98-g7-auth-negative.spec.ts`; Backend `test/auth-g7.e2e-spec.ts` | Aprobado local; sin G7 real/correo |

### Comprobaciones preliminares — 04/11/2026

| Comando / caso | Resultado | Límite |
|---|---|---|
| `npx playwright test tests/catalog-cart-integration.e2e.spec.ts tests/product-detail.e2e.spec.ts --config playwright.config.ts` | **7/7 pasaron** | El caso catálogo→ficha→carrito usa `page.route` para simular las respuestas de catálogo y carrito. Es un flujo UI MOCK; no acredita integración de esas APIs locales ni completa #98. |
| `npm run test:e2e:favorites:ui` | **9/9 pasaron** | Configuración `playwright.favorites-ui.config.ts` sobre la vista de Favoritos H3/H3 sandbox con estados simulados. Cobertura parcial de UI; no acredita persistencia/API integrada ni el flujo del segundo demo. |
| `npx playwright test --config playwright.auth-ui.config.ts` | **10/10 pasaron** | UI de registro, login/MFA y logout con respuestas interceptadas por `page.route`; no valida JWT, BFF, base de datos ni el fixture G7. |
| `npx playwright test --config playwright.fe98.config.ts` | **1/1 pasó** | Recorrido unificado catálogo→ficha→carrito→favoritos. Catálogo usa Backend local MOCK; Carrito/Favoritos y la identidad H3 se simulan con `page.route`; no valida persistencia ni G7. |
| `node node_modules/@playwright/test/cli.js test --config playwright.auth.config.ts tests/auth/g7-local.spec.ts tests/auth/fe98-g7-auth-negative.spec.ts` | **3/3 pasaron** | Navegador→Next→BFF→PostgreSQL desechable→G7 contract fixture: login/MFA, OTP incorrecto sin sesión, sesión privada, recarga, segunda pestaña, logout y login móvil. No es G7 REAL ni envío de correo. |
| `npm run test:e2e -- test/auth-g7.e2e-spec.ts` (Backend) | **18/18 pasaron** | Suite Backend con fixture HTTP y PostgreSQL desechable; incluye expiración de JWT, MFA inválido/expirado y aislamiento A/B. No se cuenta como E2E de navegador FE. |

El recorrido principal une Catálogo/Ficha/Carrito/Favoritos en UI con stubs para Carrito/Favoritos; la autenticación se valida aparte con el BFF real local y fixture G7. No se afirma todavía un único recorrido con alta/lista persistente de favoritos bajo sesión G7.

La suite `playwright.auth-ui.config.ts` también se ejecutó en esta revisión: **10/10 pasaron**. Sus respuestas de autenticación/MFA se interceptan en el navegador; es evidencia de estados de interfaz, no de JWT, BFF ni una sesión persistida. Las demás suites usan su propia configuración/puertos descritos en la tabla de resultados.

La configuración nueva `playwright.fe98.config.ts` usa puertos aislados 10110 (Backend) y 3210 (Frontend). El caso recorre los cuatro módulos solicitados. La lectura/escritura del catálogo sí consulta el Backend configurado como `CATALOG_SOURCE=mock`; la identidad de Favoritos, su API y la API del carrito se reemplazan mediante rutas interceptadas por Playwright.

Para auth integrada se usó `G7_FIXTURE_ACK=local-only`, fixture G7 `4012`, BFF `10002`, web `3002` y PostgreSQL 16 temporal sobre tmpfs. Las pruebas `g7-local.spec.ts` y `fe98-g7-auth-negative.spec.ts` pasaron `3/3`; el OTP incorrecto dejó la sesión anónima y el válido completó el flujo. El contenedor y los tres procesos se apagaron; no hay listeners en 3002, 4012, 10002 ni 55435. El Backend auth E2E también pasó `18/18` en la misma ejecución contra la base temporal.

## Comandos y resumen

```text
Comandos ejecutados:
- npx playwright test tests/catalog-cart-integration.e2e.spec.ts tests/product-detail.e2e.spec.ts --config playwright.config.ts
- npm run test:e2e:favorites:ui
- npx playwright test --config playwright.auth-ui.config.ts
- npx playwright test --config playwright.fe98.config.ts
- node node_modules/@playwright/test/cli.js test --config playwright.auth.config.ts tests/auth/g7-local.spec.ts tests/auth/fe98-g7-auth-negative.spec.ts
- npm run test:e2e -- test/auth-g7.e2e-spec.ts (Backend; requiere PostgreSQL temporal g1_auth_h4_test)

Resumen de ejecuciones registradas:
- Catálogo/ficha/carrito: 7 aprobadas, con APIs de catálogo y carrito interceptadas en navegador.
- Favoritos H3 UI/sandbox: 9 aprobadas; no cubre la integración del segundo demo.
- Auth UI MOCK: 10 aprobadas; MFA de interfaz comprobado con respuestas interceptadas, sin sesión backend.
- Recorrido #98 catálogo MOCK → ficha → carrito → favoritos: 1 aprobado; Backend local sólo para catálogo, stubs de navegador para Carrito/Favoritos.
- Auth integrada FE con fixture G7 y PostgreSQL temporal: 3 aprobados; MFA válido e inválido, sesión privada, recarga, segunda pestaña, logout y login móvil.
- Backend `auth-g7.e2e-spec.ts`: 18 aprobados; expiración, MFA y ownership A/B cubiertos en la suite Backend, no en navegador FE.
```

## Hallazgos, correcciones y retests

- Hallazgo de fixtures: `npm run mock:auth` sólo publica JWKS y emite JWT; el Backend también contiene `scripts/g7-contract-fixture.mjs`, que simula login, OTP/MFA y dos identidades. El fixture de contrato emite tokens con 15 minutos y no muestra una opción directa para emitir uno vencido.
- Hallazgo de alcance: el Backend tiene pruebas de JWT vencido y ownership de Favoritos (`test/wishlist.e2e-spec.ts`) y MFA/ownership BFF (`test/auth-g7.e2e-spec.ts`). Esta última suite se ejecutó y pasó 18/18; se atribuye al Backend, no como navegador FE.
- Correcciones en tests: se alineó el slug con el fixture vigente, se aceptó el identificador de producto usado por el endpoint de carrito y se quitó de la prueba de ficha una expectativa de carrito ajena a F-011. Se agregó `fe98-second-demo.e2e.spec.ts` y configuración propia para el recorrido unificado. No se modificó lógica de producción de Catálogo, Carrito, Favoritos o Auth.
- Retests y resultado: el recorrido principal FE #98 pasó 1/1; auth integrada FE pasó 3/3; Backend `auth-g7.e2e-spec.ts` pasó 18/18. `git diff --check` pasó; no se repitió el recorrido principal desde una base de carrito/favoritos persistente porque esos endpoints se stubbean en dicha suite.
- Limitación encontrada al intentar unificar módulos: el BFF valida que `AUTH_ENABLED=true` no se combine con `H3_SANDBOX_ENABLED=true`, pero `SandboxWishlistCatalog` y `SandboxProductEligibility` sólo permiten lectura/escritura de favoritos con el sandbox H3 habilitado. Por eso el flujo de catálogo/favorito usa stubs de UI y el flujo autenticado prueba el endpoint privado vacío; no se afirma alta/lista persistente de favoritos dentro de la misma sesión G7. No se modificó esa lógica de Favoritos.

## Conclusión

Pendiente de ejecución y revisión independiente. Esta evidencia no acreditará integración REAL con G5/G6/G7 ni envío de correo; cualquier cambio en esa clasificación requiere una prueba separada y autorizada.
