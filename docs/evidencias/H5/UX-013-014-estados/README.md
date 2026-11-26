# H5 · Evidencia de overlays y estados

FE #153 y #154. Chrome local sobre el candidato de Catálogo `073b3b0`. **12 pruebas y 28 capturas**. Resoluciones de escritorio 1280 × 900 y móvil 390 × 844.

## Overlays probados en navegador

| Overlay | Caso comprobado con componentes reales y datos sintéticos | Escritorio | Móvil |
| --- | --- | --- | --- |
| O-006 · Deshacer | Retirar la última línea, mantener visible Deshacer en el estado vacío, foco por teclado y recuperación de la línea del fixture. | [Captura](desktop-o006-carrito-vacio-con-deshacer.png) | [Captura](mobile-o006-carrito-vacio-con-deshacer.png) |
| O-007 · Ajustes | Mostrar cantidades solicitada y confirmada del resultado simulado de la fusión, enfocar Entendido, cerrar por Escape y devolver foco al invocador. | [Captura](desktop-o007-ajustes-fusion.png) | [Captura](mobile-o007-ajustes-fusion.png) |

El fixture se habilita solo en desarrollo con `H5_CART_OVERLAY_QA=true`. El caso real de O-006 depende del contrato de restauración que revalida SKU, cantidad, precio y stock. Para O-007, la fusión actual identifica al cliente por bearer. El login web de G7 usa una sesión opaca y el guard actual del carrito sigue la ruta anónima al recibir solo esa cookie. Queda conectar la identidad y verificar el recorrido real desde login, incluida MFA.

## Matriz de las 17 vistas

| Vista | Estado comprobado localmente | Evidencia y criterio pendiente |
| --- | --- | --- |
| V-001 Login | Validación, credenciales inválidas, límite, MFA y retorno interno. | [QA de cuenta](../UX-010-cuenta-V001-V004/README.md). Probar indisponibilidad de G7 en el corte publicado. |
| V-002 Registro | Validación, conservación del formulario ante 409 y solicitud aceptada. | [QA de cuenta](../UX-010-cuenta-V001-V004/README.md). Confirmar la carga de políticas y su recuperación en staging. |
| V-003 Recuperación | Derivación segura al flujo de Seguridad y error de disponibilidad. | [QA de cuenta](../UX-010-cuenta-V001-V004/README.md). El formulario de G7 requiere validación de ese proveedor. |
| V-004 Restablecimiento | Derivación de enlaces heredados y navegación hacia Seguridad. | [QA de cuenta](../UX-010-cuenta-V001-V004/README.md). Completar recorrido en G7 desplegado. |
| V-005 Inicio | Listo, carga, vacío y error con reintento. | [Capturas de Inicio](../UX-004-inicio). Validar el corte publicado y su fuente de catálogo. |
| V-006 Catálogo | Carga, vacío, error, precio por confirmar y recuperación con criterios conservados. | [Capturas de Catálogo](../UX-005-catalogo). Verificar el recorrido web contra el BFF desplegado. |
| V-007 Ficha | Ficha de prueba, 404, 503, 504 y retorno con filtros. | [Suite de ficha](../../../../tests/product-detail.e2e.spec.ts). Falta el retest de degradación por región comercial desplegada. |
| V-008 Carrito | Carga retenida, 503 visible y reintento hasta carrito vacío. | [Escritorio](desktop-v008-carrito-recuperado.png) · [Móvil](mobile-v008-carrito-recuperado.png). Las capturas de carga y error están junto a estas. |
| V-009 Favoritos | Carga, error, reintento, vacío y deshacer con fixtures. | [Suite de favoritos](../../../../tests/wishlist/views.spec.ts). Falta retest con la sesión del corte publicado. |
| V-010 Dirección | Carga, vacío, 400, 401, servicio indisponible y creación con datos simulados. | [QA de dirección](../V-010-direccion-envio/README.md). Falta recorrido con G7 en staging. |
| V-011 Resumen | Cotización y cupón aplicado. | [Checkout FE #180](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/180). |
| V-012 Pago simulado | Consentimiento requerido antes de continuar. | [Checkout FE #180](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/180). |
| V-013 Creación de pedido | Paso de confirmación y creación con fixture. | [Checkout FE #180](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/180). |
| V-014 Confirmación | Pendiente, 503 recuperable y 200 tras reintentar para el mismo pedido. | [Checkout FE #180](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/pull/180). |
| V-015 Pedidos | Carga retenida, 503 visible y reintento hasta lista vacía. | [Escritorio](desktop-v015-pedidos-recuperado.png) · [Móvil](mobile-v015-pedidos-recuperado.png). |
| V-016 Detalle | Carga retenida, 503 visible y reintento con 404 controlado. | [Escritorio](desktop-v016-detalle-recuperado.png) · [Móvil](mobile-v016-detalle-recuperado.png). |
| V-017 Seguimiento | Carga retenida, 503 visible y recuperación hacia 202 sin despacho. | [Escritorio](desktop-v017-seguimiento-recuperado.png) · [Móvil](mobile-v017-seguimiento-recuperado.png). |

Para V-008 y V-015 a V-017, la suite usa las rutas normales y simula respuestas HTTP. Los archivos `*-carga.png`, `*-error.png` y `*-recuperado.png` conservan las tres transiciones. La revisión visual completa y la aceptación del corte desplegado siguen en FE #153 y #154.

## Reproducción

Con las dependencias del proyecto y Google Chrome instalados:

```bash
npx playwright test -c playwright.h5-ux-evidence.config.ts
```
