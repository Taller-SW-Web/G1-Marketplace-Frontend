# UX-010 · Cuenta V-001 a V-004: evidencia H5 (MOCK)

Tarea: FE #150 (TASK-H5-UX-010). Fecha: 21/11/2026. Rama: `feat/h5-ux010-cuenta-v001-v004`.

> **MOCK.** Las rutas de Marketplace `/api/v1/auth/*` y `/api/v1/password/politica` las responde Playwright (`page.route`) con fixtures. No se llamó a Seguridad (G7). Es una evidencia visual: no acredita integración.

## Dirección visual

Al 21/11, FE #141 (UX-001) no tiene mockups aprobados, así que se aplicó **DS-001 v0.2.0** tal cual. Los ajustes están juntos en el bloque `H5 UX-010` de `src/app/globals.css` para re-estilar sin tocar la lógica.

## Qué cambió (solo presentación; la lógica y el flujo no cambian)

- **Títulos iguales en las cuatro vistas.** Antes, login usaba mayúsculas y registro, recuperación y restablecimiento no. Ahora todas usan H1 de DS-001 (32/40; 28/36 en móvil).
- **Sin anillo de foco al cargar.** El H1 recibe el foco por programa al abrir la vista (para el lector de pantalla), pero ya no muestra el anillo azul. Los controles interactivos conservan su foco visible.
- **Enlace "Volver a la tienda"** como cabecera pública mínima (V-001 a V-004 §5).
- **Tarjeta blanca** con borde y sombra de DS-001 sobre `surface/subtle`, el mismo patrón que checkout. Los campos tienen fondo blanco y foco `accent/signal`.
- **Móvil (<576 px): sin tarjeta flotante**, en una columna y con márgenes de 16 px (V-001 §10), y el CTA ocupa el ancho disponible.
- V-003 y V-004 se quedan como en H4: la recuperación y el restablecimiento ocurren en la página de Seguridad (`NEXT_PUBLIC_G7_RECOVERY_URL`). Sin esa URL, V-003 muestra "Recuperación no disponible" y V-004 muestra la salida a login. Esa decisión no se tocó.

## Capturas (desktop 1440×900 y móvil 390×844, página completa)

Sin scroll horizontal en los 16 casos.

| Vista | Estado | Desktop | Móvil |
|---|---|---|---|
| V-001 | Principal | `desktop-V001-01-principal.png` | `mobile-V001-01-principal.png` |
| V-001 | Validación local | `desktop-V001-02-validacion.png` | `mobile-V001-02-validacion.png` |
| V-001 | Credenciales inválidas (`401`) | `desktop-V001-03-credenciales-invalidas.png` | `mobile-V001-03-credenciales-invalidas.png` |
| V-002 | Principal | `desktop-V002-01-principal.png` | `mobile-V002-01-principal.png` |
| V-002 | Validación y política visible | `desktop-V002-02-validacion.png` | `mobile-V002-02-validacion.png` |
| V-002 | Solicitud aceptada (`201`) | `desktop-V002-03-solicitud-aceptada.png` | `mobile-V002-03-solicitud-aceptada.png` |
| V-003 | Sin URL de Seguridad configurada | `desktop-V003-01-no-disponible.png` | `mobile-V003-01-no-disponible.png` |
| V-004 | Enlace a Seguridad / enlace anterior | `desktop-V004-01-enlace-seguridad.png` | `mobile-V004-01-enlace-seguridad.png` |

Los estados de carga (política de contraseña, "Autenticando") y los de error recuperable siguen implementados como antes; esta tarea no los modificó.

## Verificación

- `npm run lint` ✔ · `npx tsc --noEmit` ✔ · `npm run build` ✔
- `npx vitest run`: 45 archivos y 392 pruebas ✔ · servidor: 81 ✔
- `npx playwright test --config playwright.auth-ui.config.ts` (accesibilidad y logout de auth): 10/10 ✔

## Ajuste pedido por Jim (21/11): validación de contraseña en V-002

- Se quitó el checklist «Cumplido / Pendiente / Formato comprobado / Coinciden» (componente `PasswordRules`).
- Ahora aparece **un mensaje rojo bajo el campo por cada regla incumplida** de la política que publica Seguridad (`/api/v1/password/politica`: longitud mínima, mayúscula, minúscula, número y carácter especial, solo si la política lo exige). Cada mensaje desaparece al cumplirse su regla; con todas cumplidas no queda texto.
- La contraseña y la confirmación muestran mensajes desde la primera escritura; nombres, apellidos, correo y celular, al salir del campo. Al enviar, se marcan todos los campos inválidos y el foco va al primero.
- Confirmación: «Las contraseñas no coinciden.» mientras no coincidan.
- Mejoras UX: aviso discreto de «Bloq Mayús está activado.», `inputmode` en correo y celular, validación del correo al salir del campo también en V-001, el botón muestra «Creando cuenta…» y no permite un doble envío, y la lista de mensajes vive en una región `aria-live="polite"` enlazada por `aria-describedby`.
- Bug corregido: Edge dibujaba su propio botón de «ojo» junto a «Mostrar» en los campos de contraseña.
- **V-004:** en G1 no hay formulario de nueva contraseña. Por la decisión del PO del 26/10, el restablecimiento ocurre en la SPA de Seguridad (G7), así que este patrón debe aplicarlo G7. **V-010** ya seguía el mismo estilo (mensaje rojo bajo el campo que desaparece al corregir) y no se cambió.
- Capturas del ajuste en `e2e/`: `*-V002-contrasena-vacia.png`, `*-V002-contrasena-debil.png`, `*-V002-contrasena-un-mensaje.png`, `*-V002-contrasena-valida.png` y `*-V002-confirmacion-no-coincide.png` (desktop y mobile).

## E2E de navegador (Playwright) · MOCK

Comando: `npm run test:e2e:cuenta` (Edge local / Chromium en CI; proyectos desktop 1440 y mobile 390). Con `E2E_EVIDENCE=1` guarda capturas en `e2e/` y video. Solo se copiaron a `e2e/video/` los videos de los casos clave. No se usan trazas ni HAR porque incluirían cuerpos de autenticación.

**MOCK:** el BFF `/api/v1/*` se responde con `page.route`, usando los códigos del contrato G7 (`catalogo-errores.md`). No se usó el mock Prism: sus respuestas son estáticas por ruta y no pueden producir, desde el navegador y a través del BFF y el Backend, estados por caso como «cuenta bloqueada» o «límite de intentos». La cadena completa queda para la prueba REAL. La SPA G7 se simula con una página stub en `127.0.0.1:4011`.

| Flujo | Casos (desktop y mobile) | Resultado |
|---|---|---|
| V-002 Registro | validación al enviar con foco en el primer error; mensajes por regla que desaparecen; confirmación que no coincide; `409` neutral que conserva datos; `201` sin sesión iniciada | Pasa |
| V-001 Login | validación local; credenciales válidas con retorno interno; inválida, sin verificar y bloqueada con el **mismo** mensaje (sin enumeración); `429` al superar el límite; MFA sin sesión antes del código, código inválido y luego válido; `returnTo` externo descartado; sin tokens en `localStorage`, `sessionStorage` ni `document.cookie` | Pasa |
| V-003 / V-004 | enlace a G7 con `canal=MARKETPLACE`, sin datos del formulario ni `Referer`; `/recuperar-contrasena` descarta parámetros; enlace heredado válido, vencido o usado: el token no queda en URL, HTML ni historial, no se reenvía y no hay sesión automática | Pasa |
| Cierre de sesión | logout invalida la sesión; «Volver atrás» no la recupera | Pasa |

Resultado local del 21/11: **22/22 pasan**. En algunas corridas, el CLI de Next 16.4.1 detiene el servidor de desarrollo para mostrar un aviso de actualización de seguridad (solo en entornos de agente) y los casos fallan con `ERR_CONNECTION_REFUSED`. Al repetir la corrida pasan. No es un fallo de las vistas.

CI: se agregó el paso a `.github/workflows/auth-h4.yml`, que ya instala Chromium para Playwright. Está en un commit local, pendiente de aprobación de Jim.

Pendiente: REAL de G7 (validez del enlace vencido o usado en la SPA G7, bloqueo y límite reales) y revisión independiente.
