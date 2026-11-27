# H5 · Overlays O-001 a O-010 · FE #153

Base de código: Catálogo H5 `073b3b0`; rama de entrega `feat/h5-153-overlays-pr`. Las capturas locales usan Chrome con datos y respuestas sintéticos en 1280 × 900 y 390 × 844. Esta evidencia cubre los estados observables de los overlays; no acredita proveedores reales ni aceptación visual independiente.

## Evidencia por overlay

| Overlay | Capturas o evidencia | Alcance demostrado |
| --- | --- | --- |
| O-001 · Filtros móvil | [PR FE #167, capturas de Catálogo](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/tree/feat/h5-145-catalogo/docs/evidencias/H5/UX-005-catalogo) | Apertura, cancelación, criterios y error de precio en escritorio/móvil. Esta entrega es la base de este PR. |
| O-002 · Visor de galería | [Escritorio](../../h3/f011-viewer-desktop.png) · [Móvil](../../h3/f011-viewer-mobile.png) | Diálogo con imagen, cierre por Escape y devolución del foco al invocador. |
| O-003 · Sesión vencida | [Escritorio](retest/desktop-o003-sesion-vencida.png) · [Móvil](retest/mobile-o003-sesion-vencida.png) | El 401 al guardar un favorito desde Catálogo abre el aviso y conserva la ruta de retorno; no repite la mutación. |
| O-004 · Cierre durante checkout | [Captura de checkout](../../H4/jim-segovia/capturas/logout-checkout.png) · [14 capturas de V-011–V-014](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/49e81c89fc08251eba332da0a1fab6a8d509dcd6/docs/evidencias/H5/UX-014-checkout/README.md) | Referencia de diálogo y estados del checkout. La política exacta con una orden `SUBMITTED` continúa pendiente en la especificación O-004. |
| O-005 · Producto agregado | [Conflicto de stock en escritorio](retest/desktop-o005-stock-rechazado.png) · [Móvil](retest/mobile-o005-stock-rechazado.png) | Un 409 explica el cambio y ofrece ver opciones; no anuncia un alta que el proveedor rechazó. |
| O-006 · Deshacer eliminación | [Carrito vacío, escritorio](desktop-o006-carrito-vacio-con-deshacer.png) · [Móvil](mobile-o006-carrito-vacio-con-deshacer.png) · [503 escritorio](retest/desktop-o006-eliminacion-rechazada.png) · [204 escritorio](retest/desktop-o006-eliminacion-confirmada.png) · [503 móvil](retest/mobile-o006-eliminacion-rechazada.png) · [204 móvil](retest/mobile-o006-eliminacion-confirmada.png) | Fixture de interacción para la variante Deshacer; en el flujo de carrito, el 503 conserva la línea y el 204 anuncia el producto. En producción no se ofrece Deshacer hasta aprobar su contrato. |
| O-007 · Resultado de fusión | [Escritorio](desktop-o007-ajustes-fusion.png) · [Móvil](mobile-o007-ajustes-fusion.png) | Ajuste sintético con cantidades solicitada/confirmada, foco inicial, Escape y retorno del foco. No acredita fusión real. |
| O-008 · Resultado de reordenado | [QA y capturas escritorio/móvil](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/test/h5-reordenado-evidencia/docs/evidencias/H5/UX-013-reordenado/README.md) | 503, reintento idempotente, resultado parcial y retorno del foco. La rama candidata tiene su ciclo de revisión pendiente. |
| O-009 · Evaluación postentrega | [Error 503 escritorio](retest/desktop-o009-error-con-borrador.png) · [201 escritorio](retest/desktop-o009-confirmacion.png) · [503 móvil](retest/mobile-o009-error-con-borrador.png) · [201 móvil](retest/mobile-o009-confirmacion.png) | El fixture conserva el borrador ante 503 y agradece tras 201. La ruta de QA no acredita elegibilidad ni activación desde pedidos. |
| O-010 · Feedback global | [O-005 / conflicto 409](retest/desktop-o005-stock-rechazado.png) · [O-006 / fallo 503](retest/desktop-o006-eliminacion-rechazada.png) · [O-009 / fallo 503](retest/desktop-o009-error-con-borrador.png) | Mensajes recuperables asociados a la acción y sin falso estado de éxito. |

## Implementación y reproducción

- O-003 distingue un 401 real de la demo local, limita el enlace de retorno a una ruta interna y devuelve el foco al control que abrió el diálogo. El usuario debe volver a elegir la acción tras iniciar sesión.
- O-006 mantiene la línea si falla el DELETE y anuncia el retiro confirmado aun cuando el carrito queda vacío. La UI publicada no presenta “Deshacer” hasta que exista restauración segura.
- O-007 se comprueba con `CartOverlayFixtures`, que contiene sólo datos sintéticos. La ruta `/demo/h5/qa-carrito` sólo se sirve en desarrollo con `H5_CART_OVERLAY_QA=true`; el build de producción devuelve 404.
- Los casos de O-003, O-005, O-006 y O-009 simulan respuestas HTTP. O-001, O-002, O-004 y O-008 enlazan su evidencia propia para mantener separadas las entregas relacionadas.

Desde la raíz de Frontend, con Node y Chrome instalados:

```bash
npx playwright test -c playwright.h5-overlays.config.ts
```

La configuración ejecuta únicamente `ux-overlays-basic.spec.ts` y `ux-overlays.spec.ts`: O-006/O-007 en la ruta aislada, y O-003/O-005/O-006/O-009 con respuestas HTTP simuladas en ambos tamaños. No prueba identidad G7, restauración del carrito, elegibilidad de Ventas ni resultados de proveedores en despliegue.

## Dependencias revisadas

| Dependencia | Estado vigente | Consecuencia para FE #153 |
| --- | --- | --- |
| Dirección visual TASK-H5-UX-001 / DS-001 | Definición y frames disponibles; el revisor aún debe aceptar la presentación de esta entrega. | No bloquea los cambios de comportamiento implementados aquí. |
| O-001 / Catálogo | Implementado en la base `feat/h5-145-catalogo`; PR #167 continúa en revisión. | Este PR se apila sobre esa base y no modifica su rama. |
| O-004-OPEN-01/02 | Producto, Arquitectura, Backend y Seguridad aún deben definir el comportamiento durante `SUBMITTED` y el contexto recuperable. | No se cambia la política de cierre; queda pendiente su decisión y revisión. |
| O-006-OPEN-01 | Backend + Producto deben aprobar la restauración del carrito y la revalidación de SKU, cantidad, precio y stock. | Se conserva el feedback informativo; no se presenta Deshacer en producción. |
| O-006-OPEN-02/03 | Backend debe confirmar el camino de favoritos; UX/UI + QA deben validar duración y pausa accesible. | La captura no se declara aprobación de esos criterios. |
| O-007-OPEN-01/02/03 | Backend/UX deben cerrar códigos, umbral del modal y datos de producto. El endpoint de fusión requiere bearer; el login web de G7 mantiene sesión opaca HttpOnly. | La vista queda como componente/fixture; no se inventa una adaptación de sesión. |
| O-009-OPEN-01 | Ventas publicó elegibilidad `ENTREGADO` y mapeo; falta comprobar titularidad, 422 y duplicado en el corte integrado. | El retest usa respuestas simuladas y no afirma elegibilidad real. |
| O-009-OPEN-02/03/04 | Producto y UX deben aprobar motivos, política de cierre/`DISMISSED` y superficie V-016/V-017. | El punto de entrada real desde pedidos queda pendiente. |

Las especificaciones O-004, O-006, O-007 y O-009 no se cambiaron. O-006/O-007/O-009 figuran en revisión por sus responsables; sus decisiones abiertas siguen visibles en [SPECS](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/tree/main/SPECS/ui/overlays). La aceptación visual independiente y el retest del corte desplegado siguen pendientes antes de cerrar #153.
