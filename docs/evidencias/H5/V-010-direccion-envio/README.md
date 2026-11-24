# V-010 Dirección de envío: evidencia H5 (MOCK)

Tareas: FE #148 (TASK-H5-UX-008), FE #59 (TASK-F022-FE-001) y FE #60 (TASK-F022-QA-001).
Fecha: 21/11/2026. Rama: `feat/f022-v010-direccion-envio`.

> **Todo lo de esta carpeta es MOCK.** Las respuestas de `/api/checkout/delivery-addresses` y `/api/cart/current` las responde Playwright (`page.route`) con fixtures del contrato `SPECS/contrato-api/F-022`. No se llamó al Backend, a Seguridad (G7) ni a ningún servicio desplegado. Esto **no** acredita integración (TASK-F022-INT-001, BE #115).

## Fuente de diseño

- Specs: `SPECS/ui/vistas/V-010-direccion-envio.md`, `SPECS/ui/F-022`, `SPECS/componentes-react/F-022`, `SPECS/contrato-api/F-022`.
- Dirección visual: **DS-001 v0.2.0** tal como está. Al 21/11, la issue FE #141 (UX-001) no tiene mockups aprobados. Los estilos de la vista están en `src/features/checkout/checkout.css` (bloque V-010), así que se pueden re-estilar sin tocar la lógica.

## Entorno

- `next dev` local con `NEXT_PUBLIC_CHECKOUT_MODE=backend-mock`, ruta `/checkout/direccion`.
- Microsoft Edge (Playwright 1.64.1). Viewports: desktop 1440×1000 y mobile 390×844 (las referencias de V-010 §10).
- En los 20 casos no hubo scroll horizontal (`scrollWidth <= innerWidth`).

## Capturas (estado de V-010 §7)

| # | Estado | Desktop | Mobile |
|---|---|---|---|
| 01 | Cargando (skeleton y Continuar inactivo) | `desktop-01-cargando.png` | `mobile-01-cargando.png` |
| 02 | Con direcciones (forma del BFF: sin teléfono; una sin etiqueta) | `desktop-02-con-direcciones.png` | `mobile-02-con-direcciones.png` |
| 03 | Sin direcciones (formulario abierto con explicación) | `desktop-03-sin-direcciones.png` | `mobile-03-sin-direcciones.png` |
| 04 | Validación en línea (blur y envío incompleto) | `desktop-04-validacion-en-linea.png` | `mobile-04-validacion-en-linea.png` |
| 05 | Guardando (CTA no repetible) | `desktop-05-guardando.png` | `mobile-05-guardando.png` |
| 06 | Error `400` por campo (datos conservados) | `desktop-06-error-400-campos.png` | `mobile-06-error-400-campos.png` |
| 07 | Servicio no disponible `503` (datos conservados y reintento) | `desktop-07-servicio-no-disponible.png` | `mobile-07-servicio-no-disponible.png` |
| 08 | Dirección creada `201` (seleccionada y anunciada) | `desktop-08-direccion-creada.png` | `mobile-08-direccion-creada.png` |
| 09 | Sesión vencida `401` (sin direcciones, acceso requerido) | `desktop-09-sesion-vencida.png` | `mobile-09-sesion-vencida.png` |
| 10 | Carrito inválido (avance bloqueado y vuelta a V-008) | `desktop-10-carrito-invalido.png` | `mobile-10-carrito-invalido.png` |

## Casos de QA funcional (FE #60), todos MOCK

Comando: `npx vitest run tests/components/checkout` (6 archivos existentes + `checkout-v010-address.test.tsx`).

| Caso | Verificación | Prueba | Resultado |
|---|---|---|---|
| RC-F-022-01 | Lista vacía: formulario abierto con foco en su título | `checkout-address-benefits` · *opens and focuses the first-address form* | Pasa |
| RC-F-022-02 | `400` conserva los campos válidos y marca solo los rechazados | `checkout-address-benefits` · *retains address fields after a rejected create request* | Pasa |
| RC-F-022-03 | `401` retira las direcciones (lista, cotización y creación) | `checkout-address-benefits` (2 casos) + `checkout-v010-address` · *removes addresses and the draft…* | Pasa |
| RC-F-022-04 | El request no incluye identidad editable (`customerId`/`userId`) | `checkout-v010-address` · *sends only the address fields…* | Pasa |
| RC-F-022-05 | Cambiar de dirección invalida la cotización | `checkout-address-benefits` · *invalidates the quote when the buyer selects a different address* | Pasa |
| Validación en línea | El error aparece al salir del campo y se va al corregirlo | `checkout-v010-address` · *validates inline on blur…* | Pasa |
| Envío incompleto | No llama a la API, lleva el foco al primer error y conserva lo válido | `checkout-v010-address` · *blocks an incomplete submit locally…* | Pasa |
| `503` al crear | Datos conservados; reintento manual sin repetición automática | `checkout-v010-address` · *preserves the typed address…* | Pasa |
| Error de carga | Distinto de "vacío", con reintento manual | `checkout-address-benefits` · *keeps a failed address load distinct from empty…* | Pasa |
| Cargando | Skeleton anunciado y Continuar deshabilitado | `checkout-v010-address` · *shows a skeleton…* | Pasa |
| Teléfono enmascarado | Si una respuesta trae teléfono, la tarjeta y el lector solo exponen los últimos 3 dígitos; si no lo trae (forma del BFF), se omite el bloque | `checkout-v010-address` · *masks the phone…* y *works with the exact BFF shape…* | Pasa |
| Carrito inválido | Continuar bloqueado y enlace a `/carrito` | `checkout-v010-address` · *blocks Continue…* | Pasa |
| Foco al cancelar | Vuelve a "Agregar nueva dirección" | `checkout-address-benefits` · *returns focus to the add-address action…* | Pasa |

## Pendientes (no se inventan)

- `V-010-OPEN-01`: los límites de los campos no están confirmados por Seguridad. La validación local (obligatorios salvo etiqueta y referencia, máximos de 40/180/60/120/15 caracteres y teléfono de 6 a 15 dígitos) es solo una ayuda y el `400` del servidor sigue mandando.
- `V-010-OPEN-02`: departamento, provincia y distrito siguen como texto, porque no hay un contrato de maestros encadenados.
- `V-010-OPEN-03`: el indicador de progreso compartido se dejó como estaba.
- Prueba REAL contra el BFF y G7: depende de BE #114 y #115 (Codex 2).

## E2E de navegador (Playwright) · MOCK

Comando: `npm run test:e2e:direccion` (Edge local / Chromium en CI; desktop 1440 y mobile 390). La UI corre en modo `backend-mock` y `/api/checkout/*` y `/api/cart/current` se responden con `page.route` según el contrato F-022. No hay Backend, Seguridad ni base de datos. Con `E2E_EVIDENCE=1` guarda capturas en `e2e/`. Los videos de los casos clave están en `e2e/video/`.

| Caso | Verificación | Resultado |
|---|---|---|
| Sólo direcciones del titular | Se muestran exactamente las que el BFF devolvió para la sesión; un `?customerId=` en la URL no se propaga; el GET va sin query; sin bloque de teléfono (el BFF no lo devuelve); nada en almacenamiento web | Pasa |
| Seleccionar existente | Elegir «Trabajo» y cotizar con `{ addressId: "ADR-A-2", cartVersion: 4 }` | Pasa |
| Validación en línea | Teléfono inválido al salir del campo; envío incompleto sin llamada y con foco en el primer error; valores válidos conservados | Pasa |
| `400` del servidor | Marca sólo `street` y conserva el resto | Pasa |
| Crear y usar | `201` deja la nueva dirección seleccionada; el body sólo lleva los campos de dirección (sin `customerId`) y la cotización usa la nueva | Pasa |
| Sin direcciones / `401` | Formulario abierto con explicación; con `401` no se muestra ninguna dirección | Pasa |

Resultado local del 21/11: **8/8 pasan** (4 casos × desktop y mobile). El CLI de Next 16.4.1 a veces detiene el servidor de desarrollo para mostrar un aviso de actualización (solo en entornos de agente); al repetir la corrida pasa.

La titularidad real (que el token de A nunca reciba direcciones de B) la garantiza el BFF y queda para la prueba REAL de BE #114/#115. CI: paso agregado en `.github/workflows/e2e.yml` (commit local, pendiente de aprobación de Jim).

## Ajustes de la revisión (22/11) · alineación con BE #331 y SPECS #19

Decisiones de Jim: el frontend **acepta direcciones sin teléfono** (el contrato del backend no cambia) y la **etiqueta es opcional** en la vista.

- **Lectura y alta separadas:** `CheckoutAddress` (lo que devuelve el BFF: `addressId`, `street`, `district`, `province`, `department` y, si G7 los trae, `label` y `reference`) y `CheckoutAddressInput` (payload de alta: el BFF sigue validando `phone` en el formulario y `label` es opcional).
- El parser de `api.ts` admite respuestas sin `phone` (lo rechaza solo si llega y no es texto) y la tarjeta omite el bloque de teléfono, visual y accesible, cuando falta. El resumen no deja un «:» suelto si no hay etiqueta.
- El campo pasa a llamarse «Etiqueta (opcional)» y no se envía `label` si queda vacío.
- Pruebas nuevas con la forma exacta del BFF: GET y POST en `checkout-api.test.ts`, el flujo completo (lista sin teléfono, alta sin etiqueta con la nueva dirección seleccionada) en `checkout-v010-address.test.tsx`, y el E2E `direccion-v010.spec.ts` con fixtures sin teléfono y una dirección sin etiqueta.
- Se regeneraron las capturas de la carpeta y de `e2e/`, y los dos videos clave.
- **Alcance REAL:** Seguridad REAL cubre el alta y el listado de direcciones; **la cotización sigue simulada** (gate separado en BE #331). Todo lo de esta carpeta sigue siendo MOCK.
