# H4 — F-001 a F-005: vistas y flujos de cuenta

Fecha: 21/10/2026 (Lima). Responsable: Jim Segovia. Revisor solicitado: Andrés Morales. Cambios generados y comprobados con Codex; revisión humana y validación visual independiente pendientes.

## Corte y alcance

- Frontend `49e6281aa62da5726bc8788be1ae25b4ee9112ed`; incluye la base de sesión `0dc5d6e` y CI de la misma rama.
- Backend asociado `06f950f455d39de8b9920e840b18ca27c2358b97`, con sesión base `068fbf9`.
- [FE #105](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/105), [BE #229](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/pull/229), [SPECS #9](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/pull/9).

| Función | Implementado y probado localmente | Falta para cierre |
|---|---|---|
| F-001 | Registro responsive, política de G7, confirmación sólo local, normalización +51, términos, pendiente de verificación sin sesión | Publicación G7, documentos legales G1 y verificación/retorno REAL |
| F-002 | Login, MFA por correo, retorno seguro, recarga/refresh, cuentas/pestañas separadas, limpieza de favoritos | Prueba REAL y fusión de carrito F-020 |
| F-003 | Logout, resultado local/remoto, modal O-004 con foco/Escape/continuar/error | Política por etapa SUBMITTED y recuperación de contexto; revisión visual mobile/independiente |
| F-004 | Solicitud neutra 202, errores y espera Retry-After sin reintento automático | Publicación, correo y rate limit/latencia reales de G7 |
| F-005 | Política dinámica, coincidencia local, token sólo en memoria/body, limpieza de URL/historial, 401/410/422/204, no sesión automática | Publicación y revocación REAL entre dispositivos; redacción de logs de hosting |

Las capacidades vienen de la configuración del BFF y no certifican disponibilidad del proveedor. Registro y recuperación están apagados por defecto. El registro exige `G1_TERMS_URL` y `G1_PRIVACY_URL` HTTPS publicadas; los enlaces `example.test` de la prueba son sintéticos y no deben desplegarse como documentación legal.

## Pruebas

- `npm run test:components`: **201 PASS**, 26 archivos.
- `npm run test:server`: **73 PASS**, 4 archivos.
- `npm run lint`: PASS, cero errores; permanece una advertencia previa de `OrdersHistory.tsx:247`.
- `npm run build` y `npm run typecheck`: PASS.
- `npx playwright test --config playwright.auth.config.ts`: **5 PASS** con navegador → Next local → BFF local → PostgreSQL temporal → G7 simulado. Se repitieron las 3 de cuenta después de corregir espaciado, consentimiento y estilo del botón principal del modal: PASS.

Casos: registro pendiente sin cookie; payload sin confirmación/canal/retorno; política no disponible sin fallback; recuperación uniforme conocida/desconocida; 429 conserva correo y bloquea envío hasta plazo; reset quita token del historial antes de enviar y no lo restaura al recargar; enlace vencido; MFA no autentica antes de OTP; retorno externo rechazado; sesión tras recarga; segunda pestaña y logout; O-004 cancelación/Escape/foco y cierre confirmado. Proxies filtran errores/cookies/campos y rechazan Origin externo/Bearer inyectado.

No hay HAR ni trazas con credenciales. Las identidades, códigos y productos de las pruebas son fixtures locales. [Guía BFF](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/blob/feat/s2-f002-f003-g7/docs/INTEGRACION-G7-H4.md). El catálogo no configurado respondió 503 en la demo de auth; esos casos no acreditan integración G6.

## Contraste visual

Se consultó contexto de diseño y capturas Figma del archivo Mockups `k6JZRdgbO7YtZXeFqygE8p`, con el skill figma-design-to-code. Se reutilizaron logo, botones, campos y tokens existentes; cuatro SVG del propio diseño conservan su tamaño raíz.

| Vista | Frames fuente inspeccionados | Captura local |
|---|---|---|
| V-002 | [Desktop 75:109](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=75-109), mobile 64:141, política 82:234 y aceptado 82:515 | [Desktop](capturas/registro-desktop.png), [mobile](capturas/registro-mobile.png) |
| V-003 | [Desktop 89:314](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=89-314), mobile 90:735, aceptado 94:360 | [Mobile](capturas/recuperar-mobile.png) |
| V-004 | [Desktop 96:347](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=96-347), mobile 97:772, inválido 109:511, vencido 109:551, éxito 109:591 | [Mobile](capturas/restablecer-mobile.png) |
| O-004 | [Diálogo 146:19](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=146-19) y contexto desktop 456:2260 | [Desktop](capturas/logout-checkout.png) |

Capturas sintéticas inspeccionadas. El texto de términos hace wrap en mobile para evitar el recorte del frame. Los requisitos ocupan altura variable porque provienen de la política publicada, sin sustituirla por el texto ilustrativo del diseño. O-004 informa que cerrar no cancela un pedido; la variante exacta por etapa continúa pendiente. Esto no constituye aprobación visual de todas las variantes.

## Gates conservados

Jim confirmó que cuentas A/B G7 y URL/revisiones BFF desplegadas están pendientes. No hubo prueba REAL ni merge. La cadena histórica de migraciones sigue bloqueada; las pruebas usaron exclusivamente esquema desechable, sin reparar ni resetear una BD compartida. SAST/SCA/DAST completos, hosting sin query sensible, revisión de Andrés y evidencia desplegada siguen pendientes. Las issues permanecen abiertas.

## Ampliación de QA de seguridad — 21/10/2026

SAST/SCA/secrets e inventario de licencias ya ejecutados en CI Linux; resultados y límites en [SEGURIDAD-H4](SEGURIDAD-H4.md). Esto amplía el corte inicial anterior; DAST, revisión y prueba REAL siguen pendientes.
