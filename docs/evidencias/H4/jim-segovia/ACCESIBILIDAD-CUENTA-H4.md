# H4 — teclado, foco y errores de cuenta

21/10/2026. Responsable Jim Segovia; revisor solicitado Andrés Morales. Código `98f167916046ced991f1aa4319a81c9ed53881a7`, [FE #105](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/105), [SPECS #9](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/pull/9). Codex asistió implementación y pruebas; aprobación humana pendiente.

## Hallazgos y correcciones

La auditoría contrastó las secciones de accesibilidad/validación de V-001–V-004. Se corrigieron foco ausente al confirmar recuperación, errores sin destino de teclado y rechazo 422 sin asociación al campo de contraseña. Reset mostraba el error de formato de la contraseña nueva en confirmación: ahora cada campo recibe su propio error.

El navegador confirmó que deshabilitar el submit durante envío quitaba el foco. Se añadió `preserveFocusWhileLoading` opcional al botón compartido; los formularios de cuenta lo usan con `aria-busy`/`aria-disabled` y prevención del click mientras carga. La exclusión de doble envío sigue también en el handler del formulario. Los campos son readonly durante envío y el consentimiento bloquea cambios sin desaparecer del orden de foco. El comportamiento predeterminado del botón sigue siendo deshabilitar al cargar.

Los títulos de las vistas/resultados reciben foco sólo al entrar o cambiar de paso. Los errores locales llevan al primer control inválido; los generales al feedback. No se reposiciona foco mientras se edita. 422 de política se asocia a contraseña, limpia ambas contraseñas y conserva datos no sensibles. Se añadieron títulos de documento específicos para registro/recuperación. MFA enfoca el paso y el aviso de vencimiento; el contador no anuncia cada tick.

Se conserva Mostrar/Ocultar con nombre de acción dinámico y foco en el botón. La [guía primaria WAI-ARIA de botones](https://www.w3.org/WAI/ARIA/apg/patterns/button/) distingue este patrón de un toggle con etiqueta constante; no se añadió un `aria-pressed` incoherente con la etiqueta cambiante. Se consultaron también las guías instaladas de accesibilidad, formularios y límites server/client de Next16.4.1.

## Verificación reproducible

| Comando / entorno | Resultado |
|---|---|
| `npm run test:components` | 201 PASS, 26 archivos |
| `npm run test:server` | 73 PASS, 4 archivos |
| `npm run lint` | PASS; una advertencia previa OrdersHistory247 |
| `npm run build` y `npm run typecheck` | PASS |
| `npx playwright test --config playwright.auth-ui.config.ts` | 6 PASS sobre build de producción, Edge local; el workflow ejecuta Chromium |
| [CI 39691871642](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/actions/runs/39691871642) | PASS: Chromium6 casos, componentes/servidor, lint, build/tipos y scans |

[Resumen sanitizado de seguridad del corte](seguridad/accesibilidad-summary.json). El inventario de dependencias no cambió. El PASS de los patrones y herramientas configurados no certifica accesibilidad ni seguridad completas.

Los seis casos verifican:

1. Registro: primer inválido, 422 asociado/foco, secretos borrados, correo conservado, Mostrar/Ocultar con teclado y resultado pendiente enfocado.
2. Recuperación: correo inválido enfocado y confirmación 202 neutra enfocada.
3. Reset: contraseña/confirmación con errores distintos, 422 corregible, éxito 204 y enlace ausente con título enfocado.
4. MFA: nuevo paso enfocado, error neutro de código enfocado y regreso al login con contexto.
5. Envío pendiente: foco de botón/campo conservado, campo readonly y Enter/Espacio sin duplicar POST.
6. Vencimiento MFA: reloj de navegador controlado; aviso de expiración enfocado, verificación bloqueada y salida disponible, sin anuncio por tick.

La suite intercepta las API del navegador con fixtures explícitos y catálogo no disponible. No necesita BFF, G7, DB ni cuentas; no acredita integración, autenticación ni conectividad externa. El origen de BFF del servidor de pruebas apunta a loopback no disponible y los enlaces legales son sintéticos. Trazas desactivadas; no se publican contraseñas, tokens ni HAR. Se conservan por separado las evidencias previas de navegador→BFF→DB con G7 simulado.

## Pendientes conservados

Revisión independiente con teclado/lector de pantalla, zoom/reflow y validación visual de variantes. Esta prueba no certifica cumplimiento completo de WCAG ni todas las vistas del Marketplace. F-020, política por etapa de O-004, DAST en staging, documentos legales publicados, G7 REAL/cuentas/cliente técnico, BFF desplegado y G-DB mantienen sus gates. No hubo merge ni cierre de issues.
