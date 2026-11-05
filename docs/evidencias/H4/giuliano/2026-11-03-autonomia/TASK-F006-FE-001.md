# TASK-F006-FE-001 — decisiones técnicas y evidencia propia

[Issue #27](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/27). Aporte de Giuliano, 03/11/2026.

Demo editorial optativa y lectura de Home compartida sólo mientras está en curso. Encabezado y Home no duplican transporte simultáneo; no se conservan respuestas completadas y se respeta cancelación por consumidor.

[Artefacto principal](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/giuliano-h4-issues-20261103/scripts/demo-catalog-h4.mjs). Se conserva el circuito de PR #124; la revisión anterior no aprueba el nuevo HEAD.

## Verificación del corte

338 componentes/proxy, 81 servidor, 30 recorridos de catálogo y cinco de destacados PASS. Build/tipos/lint PASS. Los recorridos usan Edge, Next y BFF MOCK; en el caso de favorito sólo se simula la sesión anónima, sin ejecutar altas o bajas reales.

La demo editorial con --check --matrix --integration-budget pasa sus comprobaciones y produce 24 PASS/1 INCONCLUSIVE (sin empates en la muestra), sin fallos/bloqueos locales. El reporte público de G1 conserva 15 bloqueos operativos y diez validaciones positivas; no se infiere integración del resultado MOCK.

Controles existentes de secretos/SAST/SCA PASS, sin altas/críticas ni vulnerabilidades runtime; once avisos moderados de desarrollo siguen sujetos a revisión de riesgos. Selección real/aprobación de grupo, revisión independiente, grants y SHA desplegado siguen pendientes. La issue permanece abierta y conserva responsable/revisor/DoD.

IA: Codex para implementación, pruebas y registro; no se atribuye aceptación humana independiente.


## Regla confirmada por Giuliano a partir del mensaje de Jim — 03/11/2026

**Prioridad:** destacados definidos → históricos más vendidos → aleatorios sólo cuando todavía no hay historial. Esto sustituye la selección exclusivamente editorial propuesta en el corte anterior. La confirmación de la prioridad y de la métrica no certifica revisión de código, contrato aceptado por el proveedor ni despliegue.

Giuliano eligió documentar como criterio de históricos las **unidades vendidas del canal MARKETPLACE, en todo el historial, con pago confirmado, descontando devoluciones confirmadas**. Se agrupan por producto, no por variante/SKU. La fuente autorizada y su contrato siguen pendientes de homologación; no se calculó un ranking con datos de compradores o importes administrativos.

La alternativa se evalúa al quedar vacía la selección anterior. Una selección definida parcialmente elegible se conserva sin rellenarla con otras fuentes. Si hay historial pero ninguno de sus productos es publicable, la sección puede quedar vacía: no se afirma que no haya historial. Un fallo o ausencia de la fuente de ventas es indisponibilidad técnica y no habilita aleatorios.

Implementación/demos de los tres caminos con datos sintéticos; la fuente real de ventas sigue sin conectar. El default se conserva desactivado y activar REAL sin fuente no fabrica historial vacío. Este avance pertenece únicamente a la issue indicada; las decisiones, pruebas anteriores y sus límites se conservan como cortes históricos. La issue sigue abierta, con DoD/revisor intactos.


Verificación de la nueva política: Backend 354 pruebas unitarias (34 de selección) y 62 HTTP/contratos de catálogo (7 nuevas de prioridad), tipos y build PASS. Tres demos mediante Next/BFF MOCK PASS; cinco recorridos de destacados en Edge PASS. La fuente real de ventas continúa sin conectar; estos resultados no prueban homologación, grants o despliegue.
