# feat(favoritos): implementar interfaz V-009 y operaciones F-036–039

Base: `develop`. Rama: `feat/s1-f036-f038-frontend`. Auditoría como borrador; no está listo para entrega al cliente.

La cabecera abre `/favoritos`, con solicitud de sesión, lista de productos, vacío, carga y errores. Las tarjetas separan disponibles, agotados y retirados; permiten quitar y deshacer con recuperación ante fallos. El movimiento mantiene el favorito hasta confirmar la operación y conserva la clave idempotente cuando el resultado es incierto. Se usan los recursos de Figma y los mismos componentes en la vista real y en los 18 escenarios de demostración.

Se integra `origin/develop` para conservar carrito, checkout, historial y ficha existentes. Imagen/nombre y Elegir variante enlazan a `/productos/{slug}` con `returnTo`; Ver carrito tras éxito enlaza a `/carrito`. La ficha actual es provisional MOCK y pertenece a otro integrante; falta su acción de retorno seguro.

## Límites de entrega

- GET de favoritos y movimiento atómico/idempotente no existen todavía en el backend de este corte. Los flags permanecen desactivados. Contrato: [FAVORITOS-FRONTEND-HANDOFF.md](../../FAVORITOS-FRONTEND-HANDOFF.md).
- La identidad A/B es sandbox development/test; no reemplaza la sesión real. Los handlers de favoritos rechazan producción aunque el flag sandbox sea true. Login/mi cuenta quedan pendientes.
- No se promete integración comercial, detalle homologado ni cierre de gates. Las pruebas con HTTP interceptado no acreditan persistencia real de las operaciones nuevas. La evidencia conectada anterior aplica exclusivamente a guardar/quitar.

## Auditoría solicitada

Revisar aislamiento de sesión, origen y sanitización del BFF; carreras por producto, DELETE incierto, Deshacer y foco; idempotencia de movimiento y versionado de snapshots; fidelidad visual y accesibilidad; compatibilidad de los componentes compartidos con develop. No se solicitan revisores automáticamente ni se publica en producción.

Antes de integrar develop pasaron TypeScript, lint, build, 46 pruebas de componentes, 45 de servidor, 10 E2E de vistas y una regresión de agotado/Deshacer. La aserción de bloqueo de producción pasó, pero la ejecución se interrumpió durante limpieza; no se declara cierre limpio. La revalidación tras integrar develop se registra en la descripción del PR.

Tras integrar develop: build con TypeScript aprobado, 104 pruebas de componentes y 45 de servidor aprobadas. La suite E2E pasó los diez casos existentes; el caso nuevo de navegación se corrigió para pulsar el nombre visible y pasó en ejecución aislada. Lint sin errores y con una advertencia existente en `OrdersHistory.tsx:247` (`react-hooks/exhaustive-deps`). Un primer intento de componentes concurrente con E2E agotó el timeout de checkout; la repetición aislada de toda la suite pasó sin cambiar su implementación ni los timeouts.

La suite histórica de catálogo depende de `backend/src/server.js`, ausente en este checkout; no se declara regresión global aprobada. Guía reproducible: [FAVORITOS-VISTAS.md](../../FAVORITOS-VISTAS.md). Evidencia histórica de guardar/quitar: [diego-frontend.md](diego-frontend.md).

El prompt local `PROMPT-H3-DIEGO-FRONTEND.md` y la auditoría de checkout se excluyen de los commits de esta funcionalidad. Revisión humana pendiente; no se cierran tareas oficiales.
