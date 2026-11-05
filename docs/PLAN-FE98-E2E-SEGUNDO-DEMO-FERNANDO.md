# Plan — FE #98: E2E del segundo demo

**Responsable:** Fernando Saire
**Revisor:** Jim Segovia
**Issue:** [TASK-TRANS-S02-QA-001 — Frontend #98](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/98)
**Rama de trabajo:** `test/fe98-e2e-segundo-demo-fernando`
**Base prevista:** `develop` actualizado
**Entrega solicitada por Jim:** PR independiente hacia `develop`, a más tardar el viernes al mediodía para revisión antes de la presentación del sábado.

## 1. Objetivo y alcance

Automatizar un recorrido de extremo a extremo del segundo demo desde el navegador y verificar la interacción entre la interfaz y las APIs locales de G1 en estos módulos:

1. Catálogo.
2. Ficha de producto.
3. Carrito.
4. Favoritos.
5. Autenticación UI y API, incluidos los casos negativos de JWT vencido, ownership y MFA.

El catálogo de G6 se ejecutará como **MOCK**, porque la integración real no está disponible. Para autenticación hay dos fixtures locales distintos: `npm run mock:auth` sólo emite JWT y JWKS para pruebas de API; `scripts/g7-contract-fixture.mjs` del Backend sí simula login, MFA/OTP y dos identidades. El Frontend ya contiene `tests/auth/g7-local.spec.ts` para el segundo fixture, además de pruebas de UI con respuestas interceptadas. No se requieren servicios productivos ni correo real. No se presentarán los mocks como integraciones reales.

## 2. Límites para proteger el alcance

- Mantener esta rama y su PR separadas de las ramas F-028–F-035.
- No modificar la lógica de Favoritos ni del Carrito que corresponde a otros responsables; probar sus interfaces/API existentes y coordinar cualquier defecto con su responsable.
- No habilitar proveedores reales, credenciales, tokens personales ni servicios externos.
- No incluir `.env`, secretos, datos personales, archivos generados (`next-env.d.ts`) ni cambios de planes previos en el commit.
- Los ajustes de tests deben ser específicos y reproducibles para #98; evitar refactors de catálogo, ficha, carrito, favoritos o autenticación que no sean necesarios para ejecutar el E2E.

## 3. Preparación de la rama y revisión inicial

1. Confirmar que `develop` local está sincronizado con `origin/develop` y que la rama actual parte de ese commit.
2. Revisar los cambios locales existentes en:
   - `tests/catalog-cart-integration.e2e.spec.ts`
   - `tests/product-detail.e2e.spec.ts`
3. Conservar sólo los cambios que sean necesarios y correctos para #98. Revisar el cambio de `slug` contra el fixture vigente del Backend y comprobar que el alta al carrito utiliza el contrato esperado.
4. Excluir `next-env.d.ts`, `PLAN-F028-F035-FERNANDO-FRONTEND.md` y cualquier archivo que no pertenezca al E2E #98.
5. Inspeccionar la configuración Playwright existente antes de añadir configuración: el `playwright.config.ts` predeterminado levanta Backend y Frontend aislados con catálogo mock, en puertos locales dedicados. No usar la sesión interactiva de desarrollo ni la base de datos personal como sustituto del entorno del test.

## 4. Escenarios E2E requeridos

### 4.1 Catálogo y ficha — MOCK

- El catálogo carga categorías/productos del fixture local y muestra un indicador o evidencia inequívoca de que los datos son MOCK.
- Abrir un producto del fixture, verificar título, descripción y navegación.
- Confirmar que el fixture no presenta como reales precio, stock o disponibilidad cuando el contrato no los proporciona.
- Comprobar un slug inexistente y el estado neutral/error esperado.

### 4.2 Carrito — módulos locales de G1

- Añadir un producto del fixture desde la ficha.
- Confirmar que el carrito refleja el artículo y cantidad.
- Cambiar cantidad y quitar el artículo, si las operaciones disponibles forman parte del contrato probado.
- Verificar que el escenario se limita a datos sintéticos y no afirma que G6 haya validado SKU, precio o inventario real.

### 4.3 Favoritos — módulo local de G1

- Agregar un producto del fixture a Favoritos.
- Verificar que aparece en la lista y se puede quitar.
- Comprobar el estado sin favoritos o la respuesta de error relevante.
- No cambiar lógica de Favoritos para hacer pasar la prueba; registrar y coordinar cualquier defecto del módulo.

### 4.4 Autenticación UI/API — fixtures locales

- `npm run mock:auth` (Backend) emite JWT RS256 de prueba y publica JWKS (`/jwks`, `/token`); no ofrece por sí mismo las rutas de login/OTP.
- `scripts/g7-contract-fixture.mjs` (Backend) sí contiene login, reto OTP, MFA con código de prueba `123456` e identidades sintéticas A/B. La prueba Frontend `tests/auth/g7-local.spec.ts` ya automatiza MFA, favoritos privados, recarga, segunda pestaña y cierre de sesión. Esa prueba requiere BFF y PostgreSQL de test, así que no debe ejecutarse apuntando a datos personales.
- Las pruebas de UI en `playwright.auth-ui.config.ts` reemplazan las respuestas con `page.route`; son **UI MOCK**, no validación de JWT, BFF ni identidad.
- El Backend ya tiene casos automatizados para JWT vencido y ownership de Favoritos en `test/wishlist.e2e-spec.ts`, y para MFA + ownership con sesiones BFF en `test/auth-g7.e2e-spec.ts`. Son evidencia de Backend, no del E2E del navegador FE #98; enlazar sus resultados sólo si se ejecutan y Jim acepta ese alcance.
- Verificar el rechazo de JWT vencidos y el aislamiento por ownership A/B en el BFF y recurso correspondiente sólo con fixture y base desechable. El fixture G7 emite tokens de 15 minutos y no ofrece una ruta de token expirado; no afirmar ese caso desde `mock:auth` hasta confirmar el mecanismo reproducible con Jim/equipo Backend.
- Confirmar respuestas seguras sin filtrar si existe una cuenta o recurso ajeno. No usar correo real.

**Pendiente de coordinación antes de declarar auth completa:** Jim indicó `npm run mock:auth` para los negativos. Se encontró además el fixture de contrato G7 descrito arriba. Confirmar cuál pretende para #98 y cómo generar un JWT vencido reproducible. Mientras tanto, registrar los resultados UI MOCK por separado y no inventar endpoints, tokens ni códigos.

## 5. Etiquetado MOCK/REAL

La evidencia y la PR deben identificar explícitamente:

| Parte | Clasificación en este E2E | Evidencia esperada |
|---|---|---|
| Catálogo de productos | **MOCK** | Fixture del Backend; sin llamada a G6 |
| Backend/BFF de G1 | **LOCAL** | Proceso/API local levantado por Playwright |
| Frontend de G1 | **LOCAL** | Next.js local controlado por Playwright |
| Auth externo G7 | **MOCK / LOCAL según escenario** | `mock:auth` para JWT/JWKS; `g7-contract-fixture.mjs` para login/OTP; configurar y etiquetar por separado |
| Carrito y Favoritos | **LOCAL** | Flujos del sistema G1 contra los servicios configurados en el test; anotar si una ruta concreta usa stub de test |
| G5, G6, G7 productivos y correo | **NO PROBADOS** | No afirmar integración REAL |

No etiquetar toda la ejecución como REAL por usar los procesos locales de G1. Si se intercepta una API con `page.route`, marcar ese tramo como MOCK/STUB y describir qué se está sustituyendo.

## 6. Ejecución y criterios de aceptación

- Usar la configuración Playwright aislada apropiada y puertos de test, verificando que no reutiliza el servidor de desarrollo ni servicios externos.
- Ejecutar primero los escenarios nuevos de #98; luego la suite E2E afectada y las comprobaciones Frontend relevantes para detectar regresiones.
- Repetir el recorrido completo una vez desde un estado limpio y registrar resultados reproducibles.
- Conservar traces/capturas sólo cuando aporten evidencia; revisar que no contengan tokens, cookies, datos personales ni secretos.
- La ejecución se considera lista para revisión cuando los cinco módulos tienen cobertura, los negativos pasan en las suites atribuibles a Frontend/Backend, los resultados son repetibles y la clasificación MOCK/LOCAL/NO PROBADO está clara. La falta de un único recorrido de browser con favoritos persistidos bajo sesión G7 debe quedar aprobada por Jim o resolverse con el responsable de Favoritos antes de afirmar esa cobertura.
- Un bloqueo de servicio o fixture debe registrarse con causa y evidencia; no convertirlo en un test omitido silenciosamente.

## 7. Evidencia y PR

Al terminar, completar [`docs/evidencias/H4/fernando/FE98-E2E-SEGUNDO-DEMO.md`](evidencias/H4/fernando/FE98-E2E-SEGUNDO-DEMO.md) con commit SHA, entorno, comandos, casos/resultados, límites MOCK/REAL, defectos y retests. No registrar secretos ni tokens.

Crear una PR **sólo para esta rama** hacia `develop`, con título sugerido `test(H4): E2E segundo demo FE #98`, enlace `Refs #98` (sin cerrar automáticamente la issue), resumen de cobertura y enlace a la evidencia. Solicitar revisión de Jim. No incluir ni esperar la revisión de las ramas F-028–F-035.

## 8. Estado

- [x] Issue #98 y alcance de Jim revisados.
- [x] Rama local independiente creada desde `develop` actualizado.
- [x] Revisión/selección de los cambios E2E locales.
- [x] Jim confirmó usar `scripts/g7-contract-fixture.mjs` para login/MFA y explicó que la suite Backend fuerza el JWT vencido modificando `accessExpiresAt` en la PostgreSQL desechable.
- [x] Suite Frontend `tests/auth/g7-local.spec.ts` ejecutada con BFF local, fixture G7 y PostgreSQL temporal.
- [x] Suite Backend `test/auth-g7.e2e-spec.ts` ejecutada contra PostgreSQL desechable para JWT vencido, ownership A/B y MFA.
- [x] Catálogo, ficha, carrito, Favoritos y autenticación tienen cobertura ejecutada por suites identificadas y límites MOCK/LOCAL explícitos.
- [x] Recorrido UI catálogo MOCK → ficha → carrito → Favoritos agregado como prueba aislada; carrito y Favoritos usan stubs de navegador.
- [x] Jim confirmó que `AUTH_ENABLED` y `H3_SANDBOX_ENABLED` son incompatibles intencionalmente y pidió mantener separados el recorrido MOCK y la prueba REAL contra el simulador G7.
- [x] Se documentó que agregar un favorito persistente dentro del flujo G7 es opcional; no se presenta un stub como persistencia real.
- [x] Evidencia final actualizada con la salida de la ejecución local FE #98 y la limitación de CI.
- [x] PR independiente #129 abierta; revisión de Jim pendiente.
- [ ] Fusionar sólo después de la revisión y aprobación de Jim.
