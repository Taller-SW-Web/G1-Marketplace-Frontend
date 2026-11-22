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
