# Favoritos: reutilización de autenticación G7

Fecha: 03/11/2026. PR [Frontend #118](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/118), [Backend #239](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/pull/239). Issue de alta backend: [#175](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/175).

El frontend ya conecta guardar, listar y quitar favoritos con `authRequestGuard`/`bffFetch`, implementados con la integración de cuenta de Jim. F-039 también reutiliza esos componentes con su opt-in existente. No se añade otro login ni se cambian flags, endpoints o persistencia de producción.

## Cobertura completada

`tests/server/auth-g7.test.ts` añade cuatro casos ejecutados: guardar 201, repetir 200, rechazar inyección de propietario antes de enviar y tratar un fallo de transporte como `504 RESULT_UNCERTAIN` sin retry ni fallback sandbox. Sólo se reenvía la cookie opaca G1; las cookies ajenas, Bearer y campos privados del proveedor no se exponen ni se utilizan para elegir titular.

Comando: `node node_modules/vitest/vitest.mjs run --config vitest.server.config.mts tests/server/auth-g7.test.ts tests/server/favorites-cart-auth.test.ts`.

Resultado: **47 pruebas aprobadas** (31 auth G7 y 16 F-039); typecheck aprobado. Son handlers con fetch controlado, no prueba de despliegue ni G7 externo.

El backend amplía su suite existente a **21 pruebas de sesión G7 con PostgreSQL temporal**, incluidas ocho nuevas para F-036: A/B, 201/200, MFA, expiración/logout, refresh, inyección/CSRF, introspección y recuperación tras fallo G6. Identidad sandbox desactivada, tokens RS256 y G7 HTTP loopback; elegibilidad Productos controlada. El runner aislado también aprobó 41 pruebas de integración y eliminó su contenedor al terminar.

[Reporte backend y límites](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/blob/feat/diego-h4-favoritos-csat/docs/evidencias/H4/diego/G7-FAVORITOS-2026-11-03.md).

Quedan pendientes la revisión de Fernando, el corte desplegado con A/B y los contratos/provider/grants REAL de G6. No se acredita cierre de #175/#177 con fixtures. La integración base G7 está reutilizada; la siguiente implementación/homologación propia puede centrarse en G6 sin duplicar autenticación.
