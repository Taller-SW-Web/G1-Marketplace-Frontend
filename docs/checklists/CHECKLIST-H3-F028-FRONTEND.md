# Checklist frontend — H3 / F-028 Historial de pedidos

> Guía de implementación para la rama `feat/h3-f028-historial-pedidos`. Alcance: corte individual de H3 con fixture `MOCK`; no equivale al cierre de F-028 ni a integración con Ventas.

## Base revisada

- [ ] Partir de la base Next.js App Router de `main` y respetar `AGENTS.md` y la documentación local de la versión instalada antes de tocar código Next.js.
- [ ] Reutilizar el shell y componentes comunes existentes (`Header`, `Footer`, `Feedback`, `Skeleton`, botones/estilos/tokens) cuando encajen; no copiar componentes del catálogo para simular pedidos.
- [ ] Revisar F-028 funcional, UI, contrato API, componentes React, V-015 y el checklist general en SPECS.
- [ ] Registrar que el frontend actual tiene rutas de inicio y catálogo, pero todavía no la ruta de pedidos.

## Ruta y componentes

- [ ] Añadir la página `/mis-pedidos` en App Router.
- [ ] Crear `OrdersHistoryContainer` como coordinador de consulta y estados.
- [ ] Crear `OrderList` presentacional, sin `fetch`, reglas de autorización ni lógica de Ventas.
- [ ] Definir tipos frontend para el contrato de Marketplace: resumen de pedido y metadatos de página; no añadir campos ajenos al contrato.
- [ ] Cada resumen presenta código/ID opaco, fecha, total con moneda, estado con texto y enlace accesible al detalle. La implementación completa de F-030 queda fuera de H3.
- [ ] Historial vacío muestra el mensaje y CTA para explorar el catálogo; no renderizar filtros de F-029 en este corte.

## Transporte y privacidad

- [ ] El navegador consulta una ruta same-origin de Next (por ejemplo, `/api/orders/me?page=0&pageSize=10`); esa ruta server-side reenvía al BFF Marketplace.
- [ ] El BFF de Marketplace es el único destino de la UI. No llamar Ventas directamente desde el navegador.
- [ ] Mantener URL del backend configurable por entorno, con validación del origen y manejo de timeout/error siguiendo el patrón de proxy existente.
- [ ] No enviar `clienteId` en ruta, query, headers propios, props ni cuerpo.
- [ ] No exponer secretos ni token técnico al cliente. La autenticación real y el forwarding de JWT se activarán cuando el contrato de sesión esté disponible; el corte H3 usa fixture `MOCK`.
- [ ] Mantener `cache: no-store`/política equivalente para respuestas privadas y evitar almacenamiento de pedidos en stores persistentes, localStorage o analítica.
- [ ] Las fixtures de frontend, si fueran necesarias para pruebas visuales, contienen datos inventados y se etiquetan como MOCK; la fuente de pantalla debe seguir siendo la ruta del BFF simulado.

## Estados de pantalla

- [ ] `loading`: skeleton dentro de la región consultada, sin pedidos de ejemplo.
- [ ] `list`: representar la lista y metadatos devueltos.
- [ ] `empty`: sólo cuando el backend responde correctamente con cero pedidos; mostrar CTA al catálogo.
- [ ] `error`: mensaje recuperable y botón reintentar; preservar contexto seguro.
- [ ] No convertir timeout, 4xx/5xx ni DTO inválido en `empty`.
- [ ] Cuando se conecte auth real, `401` debe retirar los pedidos previamente visibles y ofrecer acceso/login seguro.
- [ ] En paginación, mostrar estado actualizado sin mezclar silenciosamente la página anterior con la nueva. La paginación ampliada puede permanecer fuera del prototipo si sólo se consulta la primera página.

## Accesibilidad y responsive

- [ ] Usar encabezados semánticos y etiquetas claras; el enlace a detalle identifica el pedido por código.
- [ ] Mantener foco visible, navegación por teclado y contraste de texto/badges; estado no comunicado sólo por color.
- [ ] En desktop, lista/tabla mantiene encabezados asociados; en móvil, cada pedido se presenta como tarjeta conservando los mismos datos esenciales.
- [ ] Verificar reflow/zoom y que acciones no requieran hover.
- [ ] Consultar los frames aprobados de V-015 antes de afirmar fidelidad visual; si no hay frame específico, dejarlo anotado como pendiente.

## Pruebas a preparar

- [ ] Prueba de componente: carga.
- [ ] Prueba de componente: lista con fixture conforme al DTO.
- [ ] Prueba de componente: vacío con CTA al catálogo.
- [ ] Prueba de componente: error y reintento.
- [ ] Asegurar que error/timeout no se representa como vacío.
- [ ] Asegurar que ninguna llamada del navegador incluye `clienteId`.
- [ ] Prueba de ruta/proxy: consulta al BFF, no a Ventas, y respuesta no cacheada.
- [ ] Ejecutar y registrar comandos definidos en `package.json` (`npm run typecheck`, `npm run lint`, `npm run test:components`; E2E si el entorno/API mock está preparado). No registrar comandos no ejecutados.

## Evidencia y entrega

- [ ] Guardar screenshot sanitizado de la ruta en estado vacío y/o lista, más error recuperable.
- [ ] Enlazar rama, commit, PR hacia `develop`, revisión de Jim y tarea `TASK-F028-FE-001`.
- [ ] Adjuntar entorno, comando exacto, resultado y tipo de fuente `MOCK`.
- [ ] Explicar cambios propios, decisiones, uso/revisión de Codex u otra IA y desviaciones de las specs.
- [ ] Escribir explícitamente: “avance individual MOCK de F-028 para H3; no prueba integración real con Ventas ni cierra F-028”.
- [ ] No activar ni desplegar esta vista como funcionalidad real antes de resolver identidad/autorización e I-03.

## Fuera de alcance H3

- [ ] No implementar filtros de estado/fechas (F-029), detalle completo (F-030), reorder (F-031), tracking (F-032) ni correos (F-033–F-035).
- [ ] No simular sesión real, titularidad real ni integración con Ventas.
- [ ] No guardar pedidos en persistencia del navegador.

## Referencias

- `G1-Marketplace-SPECS/SPECS/funcional/F-028-historial-pedidos.md`
- `G1-Marketplace-SPECS/SPECS/ui/F-028-historial-pedidos.md`
- `G1-Marketplace-SPECS/SPECS/contrato-api/F-028-historial-pedidos.md`
- `G1-Marketplace-SPECS/SPECS/componentes-react/F-028-historial-pedidos.md`
- `G1-Marketplace-SPECS/SPECS/ui/vistas/V-015-historial-pedidos.md`
- `G1-Marketplace-SPECS/plan/seguimiento/F-028-historial-pedidos.md`
