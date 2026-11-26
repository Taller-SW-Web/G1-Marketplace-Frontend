# Paquete de evidencia H5

**Estado:** parcial; hay evidencia real de compra, BFF, RabbitMQ G7 y webhook, además de pruebas de laboratorio y performance. Faltan enlaces primarios para algunas corridas y siguen pendientes SAST/DAST y varios gates.  
**Corte de evidencia congelada:** viernes 27 de noviembre de 2026, 15:00 (America/Lima).  
**Compra de referencia:** `PED-2026-00092`.

Este índice organiza la evidencia de extremo a extremo para la exposición. Cada responsable debe reemplazar `Pendiente` con enlaces permanentes a los runs, reportes y tablas originales. Conservar fecha/hora, ambiente, commit o versión, resultado y responsable; no copiar secretos ni datos personales. Si una prueba no aplica o falla, registrarlo explícitamente con su causa y enlace.

## Índice por punto

| Prioridad | Punto | Documento | Estado |
|---|---|---|---|
| 1 | [#324 — Paquete de evidencia H5](#1-324-paquete-de-evidencia-h5) | Este índice | Parcial; enlaces primarios pendientes |
| 2 | [#299 — Trazabilidad F → prueba → run](299-trazabilidad.md) | [Trazabilidad](299-trazabilidad.md) | Parcial; falta `correlation-id` visible |
| 3 | [#325 — Arquitectura C4](325-arquitectura-c4.md) | [C4](325-arquitectura-c4.md) | Diagrama base; adjuntar evidencia |
| 4 | [#321 — Contrato de eventos](321-contrato-eventos.md) | [Contrato y diagrama](321-contrato-eventos.md) | Parcial; faltan schemas y nombres confirmados |
| 5 | [#293 — Contract tests de Productos](293-contract-tests-productos.md) | [OpenAPI y contract tests](293-contract-tests-productos.md) | Pendiente; Productos y Ofertas |

### Evidencia relacionada de Ventas (#295)

Los contract tests de Ventas aportan contexto al paquete, pero no sustituyen BE #293 (OpenAPI de Productos y Ofertas). El detalle y los límites están en [#295 — Contract tests de Ventas](295-contract-tests-ventas.md).

## Evidencia de performance

La re-medición móvil del despliegue de `develop` (SHA `93fdc79f…`) del 26 de noviembre está resumida en [Lighthouse móvil — despliegue del corte H5](performance-2026-11-26.md), con enlaces directos a cada reporte de PageSpeed Insights.

## 1. #324 — Paquete de evidencia H5

La secuencia de negocio de referencia es la compra real `PED-2026-00092`, reportada por los líderes. Los requestId/eventId documentan saltos concretos, pero todavía no acreditan un `correlation-id` de extremo a extremo.

| Evidencia | Run / fuente | Reporte | Resultado verificado | Estado / límite |
|---|---|---|---|---|
| Compra real `PED-2026-00092` | [BE #380](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/380) / [#397](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/397); commit `f17896d`; enlaces de run/log: Pendiente | Confirmaciones de Ventas: enlace Pendiente | `PROD-101`; 139,90 PEN; `TARJETA_CREDITO`, `DELIVERY`; POST 15:06:11→202; `PAGADO` confirmado 15:17:04; lecturas BFF 15:26→200; reintento idempotente 15:46:09→202, mismo pedido sin duplicado | Evidencia reportada; `ENTREGADO` REAL de este pedido sigue pendiente |
| Ronda BFF con cuenta A | Reporte en `docs/evidencias/H5/integracion-real/bff/2026-11-26/`; PR a develop anunciado, aún pendiente | Misma carpeta; enlace a PR/reporte: Pendiente | 26/11 16:00:23–16:00:32; 19/19 OK, 0 fallos, 0 respuestas 429 | Evidencia reportada; falta enlace a PR/run publicado |
| Evento G7 en RabbitMQ | BE #313 y #294 ([#313](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/313), [#294](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/294)); comentario/run directo: Pendiente | Comentarios de issues | Evento real `5206c121-61e7-4de9-8fe9-0b11306c0daa`, leído de `marketplace.usuarios` y cotejado con outbox el 25/11 23:07 | REAL reportado; adjuntar permalink sanitizado del comentario/log |
| Webhook de despacho desde Ventas (`ShipmentStatusUpdated`) | BE #318 ([issue](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/318)); permalink de run/comentario: Pendiente | Reporte primario: Pendiente | 7 eventos persistidos entre 11:05:47–11:05:50 (5 `DESPACHADO`, 2 `ENTREGADO`); token incorrecto rechazado con 401 | REAL reportado; pedido al que pertenecen esos eventos: Pendiente |
| Reintento de correo C-002 | BE #162 ([issue](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/162)); permalink de run: Pendiente | Reporte primario: Pendiente | `PED-2026-90001`, evento `c53403f0-a940-44d6-a3f1-4652d301e99a`; envío 17:07:59 y reintento 17:09:12 marcado `duplicate:true`; llegó un solo correo | REAL reportado; evidencia complementaria, no el pedido `00092` |
| Contract tests de Ventas | [PR #344](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/pull/344), merge `dc66208`; enlace directo a CI: Pendiente | [Detalle #295](295-contract-tests-ventas.md) | Snapshots OpenAPI offline 6/6; provider local con datos/token sintéticos | Aporta contexto; no equivale a Productos/Ofertas ni a Ventas REAL |
| Consumidor — pruebas de laboratorio | `H5-evidencia-consumidor-Leonidas.md`; URL del archivo/run: Pendiente | La evidencia documenta RabbitMQ 4.1 y PostgreSQL 16 desechables | Eventos sintéticos; duplicado y recuperación de conexión; ensayo separado con reintentos/DLQ | LAB LOCAL; no presentarlo como integración REAL |
| k6 — cinco casos de performance | Reporte #396; resultados/enlaces: Pendiente | [Reporte final de performance](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/blob/154ecf03eed9cc0d50c5b81b10294c37dc2c1e02/docs/evidencias/H5/performance/be-391/reporte-final.md#casos-de-performance-para-be-392) | Cinco casos, resultados y enlaces según el reporte | Docker local con terceros simulados; performance, no integración REAL |
| E2E FE #138 carrito/checkout | [Run Playwright CI](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/actions/runs/45902315375/job/140190792229) | Reporte HTML/video/traza de QA completa: Pendiente | E2E de CI con datos simulados | Evidencia parcial; no prueba compra REAL |
| Cuenta B, denegación de pedido ajeno | Run/log: Pendiente | Pendiente | Se espera 403; evidencia aún no recibida | Pendiente |
| CSAT | Run/reporte: Pendiente | Pendiente | Escenario pendiente de evidencia | Pendiente |
| Estado `ENTREGADO` REAL de `PED-2026-00092` | Run/log de Ventas/webhook: Pendiente | Pendiente | Líder indicó que se agregará cuando ocurra | Pendiente |
| SAST | Run/reporte H5: Pendiente | Pendiente | Pendiente | Pendiente |
| DAST | Run/reporte H5: Pendiente | Pendiente | Pendiente | Pendiente |

### Correlación del paquete

| Campo | Valor / enlace |
|---|---|
| ID de compra | `PED-2026-00092` |
| `correlation-id` de extremo a extremo | Pendiente; los valores recibidos son `requestId` y `eventId`, no se ha mostrado aún el `correlation-id` en logs |
| Request IDs de Ventas/BFF | `e1e1933f-0510-4918-af56-34d3a588f064` (POST); `d1750523-fd6b-43f6-b8ac-e9e64a55ee9f` (GET `/orders/me`); `103f155a-6040-4fa9-89de-f7f39fa7ab1e` (GET por pedido); `132ea7e8-9bdc-46ca-af2a-c0a96a6d2c57` (reintento idempotente) |
| Ambiente y ventana temporal | Compra REAL, 26/11; horas reportadas en tabla (zona horaria pendiente de confirmar) |
| Commit / release probado | `f17896d` para compra; SHA del deploy BFF: Pendiente |
| Carpeta de reportes congelados | Pendiente |
| Tabla consolidada de resultados | Pendiente |

## Criterio de congelamiento

Antes del corte, cada entrada debe apuntar a la fuente primaria y declarar `PASS`, `FAIL`, `BLOCKED`, `LAB LOCAL` o `N/A`, junto con hora, zona horaria, ambiente y versión probados. Las evidencias comunicadas por los líderes quedan registradas, pero el paquete sigue parcial hasta añadir los permalinks sanitizados de reportes/comentarios donde hoy figuran como pendientes. El índice debe permitir navegar desde la compra hasta BFF, webhook, consumidor, k6, SAST y DAST sin inferir resultados ausentes.

## Aprobaciones

| Aprobación | Estado | Evidencia |
|---|---|---|
| Giuliano — FE #142: DS-001 y SPECS #23 | Aprobación pendiente | [Issue FE #142](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/142); el comentario de solicitud ya fue publicado (se reportaron dos comentarios duplicados); falta confirmación de Giuliano |

