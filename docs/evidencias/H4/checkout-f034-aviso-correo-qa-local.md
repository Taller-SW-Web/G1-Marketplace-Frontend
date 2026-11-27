# H4 · F-034 Orden confirmada — evidencia local (fixture/MOCK)

Avance de [FE #83](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/83) y [QA #84](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/84). Base: `develop@e933d603d0088607e3bc1c704aae6773d5b58b39`; rama `feat/f034-order-email-notice`. Entorno: Windows, Node 24.20.0, npm 11.19.0, Vitest 5.0.4 y Playwright 1.64.1 con Edge 158.0.4370.45. Sin proveedor, mensajes salientes ni datos personales reales.

## Diseño y contrato revisados

- [F-034 React](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/blob/bc79ee25cc5cb3e2d9511f474a78f278ac1c41a4/SPECS/componentes-react/F-034-enviar-confirmacion-asincrona.md), [C-001](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/blob/bc79ee25cc5cb3e2d9511f474a78f278ac1c41a4/SPECS/ui/comunicaciones/C-001-correo-confirmacion-pedido.md) y V-014 [desktop](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=420-6225) / [mobile](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=447-7752). El aviso complementa F-027: no implementa la plantilla ni envía C-001.
- El [contrato de consulta](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/blob/23638beef4243d62de9631091b26976e6cf3df4d/docs/contratos/checkout-h4.openapi.yaml) no expone destinatario ni resultado de entrega. `OrderEmailNotice` sólo recibe la confirmación del pedido y el indicador de vista previa. No usa el email del formulario, no consulta ni reintenta el envío, y no presenta estados de proveedor. El enmascaramiento queda pendiente de fuente autorizada (V-014-OPEN-03).

## Casos ejecutados

| Caso | Evidencia fixture/MOCK |
|---|---|
| RC-F-034-01: remontar | La prueba del componente no observa llamadas `fetch`; la vista de consulta remontada sólo relee la operación original y no crea el pedido. No prueba deduplicación del outbox. |
| RC-F-034-03/04: privacidad y texto | `PAGADO` fixture/MOCK sin destinatario muestra copia futura rotulada como vista previa; no repite el correo del formulario, no muestra un placeholder y no afirma envío ni entrega. |
| Transiciones F-027 → F-034 | El aviso se omite en carga, `SUBMITTED/CREADO`, `ANULADO`, error de consulta y cambio de operación; aparece tras `SUCCEEDED/PAGADO` de la operación y pedido correctos. La prueba de cambio de operación verifica que un resultado ajeno no conserve el aviso anterior. |
| Responsive y accesibilidad | Playwright a 320 y 1280 px: nota dentro del viewport, texto sin desbordar, icono decorativo local para cada ancho, nota/texto en el árbol accesible, envío del pedido con Enter, foco en el título de confirmación y Tab hacia «Copiar código». Contraste calculado de tokens: 16,25:1 (título) y 7,50:1 (cuerpo). Falta retest manual con lector de pantalla y zoom al 200 %. |
| RC-F-034-02: `503` del proveedor | **No ejecutado.** No hay estado de proveedor en la UI ni integración de correo en estas pruebas. El `503` del proveedor no equivale a un error al consultar la operación; hace falta probar en servidor que el pedido siga confirmado y releerlo en UI. |

### Comandos y resultados

```sh
npm run test:components -- tests/components/order-email-notice.test.tsx tests/components/checkout-payment-confirmation.test.tsx tests/components/checkout-flow.test.tsx tests/components/checkout-recovery.test.tsx tests/components/checkout-api.test.ts tests/components/checkout-proxy.test.ts
npm run test:checkout:e2e
npm run typecheck -- --incremental false
npm run lint
git diff --check
```

- Vitest: 6 archivos, **52 pruebas aprobadas**.
- Playwright local en copia temporal, modo fixture: **4 aprobadas**, 1 smoke opcional de Backend MOCK omitida.
- Typecheck, lint y revisión de whitespace aprobados.

## Pendiente REAL / staging

- [Backend #165](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/165), [BD #166](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/166) e [INT #167](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/167): verificar `PAGADO` del mismo pedido con Ventas (I-02), cerrar G-MAIL y probar en sandbox autorizado el evento único, la inyección de `503` y timeout, y que ninguno degrade la confirmación. Registrar versión del proveedor, request/response y trazas sanitizadas; no registrar destinatarios.
- Staging: URLs, SHA de FE/BE, ejecución de CI/CD y verificación privada UI/API, incluyendo titularidad, relectura del pedido y accesibilidad manual. Esta evidencia no acredita despliegue, entrega ni aprobación.
- Revisión independiente recomendada: **Diego Espinoza (`DiesmEsp`)**. No solicitada; sin cierre de issues.
