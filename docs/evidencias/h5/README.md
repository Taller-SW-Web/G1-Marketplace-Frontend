# Paquete de evidencia H5

**Estado:** esqueleto listo; evidencias pendientes de entrega por los responsables.  
**Corte de evidencia congelada:** viernes 27 de noviembre de 2026, 15:00 (America/Lima).  
**Compra de referencia:** `PED-2026-00092`.

Este índice organiza la evidencia de extremo a extremo para la exposición. Cada responsable debe reemplazar `Pendiente` con enlaces permanentes a los runs, reportes y tablas originales. Conservar fecha/hora, ambiente, commit o versión, resultado y responsable; no copiar secretos ni datos personales. Si una prueba no aplica o falla, registrarlo explícitamente con su causa y enlace.

## Índice por punto

| Prioridad | Punto | Documento | Estado |
|---|---|---|---|
| 1 | [#324 — Paquete de evidencia H5](#1-324-paquete-de-evidencia-h5) | Este índice | En preparación |
| 2 | [#299 — Trazabilidad F → prueba → run](299-trazabilidad.md) | [Trazabilidad](299-trazabilidad.md) | Plantilla |
| 3 | [#325 — Arquitectura C4](325-arquitectura-c4.md) | [C4](325-arquitectura-c4.md) | Diagrama base; adjuntar evidencia |
| 4 | [#321 — Contrato de eventos](321-contrato-eventos.md) | [Contrato y diagrama](321-contrato-eventos.md) | Plantilla |
| 5 | [#293 — Contract tests de Productos](293-contract-tests-productos.md) | [OpenAPI y contract tests](293-contract-tests-productos.md) | Plantilla |

## Evidencia de performance

La re-medición móvil del despliegue de `develop` (SHA `93fdc79f…`) del 26 de noviembre está resumida en [Lighthouse móvil — despliegue del corte H5](performance-2026-11-26.md), con enlaces directos a cada reporte de PageSpeed Insights.

## 1. #324 — Paquete de evidencia H5

La secuencia de negocio de referencia es la compra real `PED-2026-00092`. Adjuntar evidencia para cada salto e indicar cómo se correlaciona con el siguiente.

| Orden | Evidencia | Run | Reporte | Tabla / resultado | Responsable / nota |
|---:|---|---|---|---|---|
| 1 | Compra real `PED-2026-00092` | Pendiente | Pendiente | Pendiente | Pendiente |
| 2 | Recorrido por el BFF | Pendiente | Pendiente | Pendiente | Pendiente |
| 3 | Entrega y recepción del webhook | Pendiente | Pendiente | Pendiente | Pendiente |
| 4 | Procesamiento del consumidor | Pendiente | Pendiente | Pendiente | Pendiente |
| 5 | Carga k6 | Pendiente | Pendiente | Pendiente | Pendiente |
| 6 | SAST | Pendiente | Pendiente | Pendiente | Pendiente |
| 7 | DAST | Pendiente | Pendiente | Pendiente | Pendiente |

### Correlación del paquete

| Campo | Valor / enlace |
|---|---|
| ID de compra | `PED-2026-00092` |
| `correlation-id` de extremo a extremo | Pendiente |
| Ambiente y ventana temporal | Pendiente |
| Commit / release probado | Pendiente |
| Carpeta de reportes congelados | Pendiente |
| Tabla consolidada de resultados | Pendiente |

## Criterio de congelamiento

Antes del corte, cada entrada debe apuntar a la fuente de evidencia y declarar `PASS`, `FAIL`, `BLOCKED` o `N/A`, junto con la hora y versión probadas. El índice debe permitir navegar desde la compra hasta los reportes de BFF, webhook, consumidor, k6, SAST y DAST sin inferir resultados ausentes.

## Aprobaciones

| Aprobación | Estado | Evidencia |
|---|---|---|
| Giuliano — FE #142: DS-001 y SPECS #23 | Pendiente | Comentario/aprobación en FE #142: Pendiente |

