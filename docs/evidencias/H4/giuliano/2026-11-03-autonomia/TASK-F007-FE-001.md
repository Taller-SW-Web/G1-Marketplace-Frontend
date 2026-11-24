# TASK-F007-FE-001 — decisiones técnicas y evidencia propia

[Issue #29](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/29). Aporte de Giuliano, 03/11/2026.

La demo permite el perfil temporal G6=15 s/Next=18 s mediante --integration-budget, con objetivo documentado de 5 s. La configuración de producción y los defaults no se modifican.

[Artefacto principal](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/giuliano-h4-issues-20261103/scripts/demo-catalog-h4.mjs). Se conserva el circuito de PR #124; la revisión anterior no aprueba el nuevo HEAD.

## Verificación del corte

338 componentes/proxy, 81 servidor, 30 recorridos de catálogo y cinco de destacados PASS. Build/tipos/lint PASS. Los recorridos usan Edge, Next y BFF MOCK; en el caso de favorito sólo se simula la sesión anónima, sin ejecutar altas o bajas reales.

La demo editorial con --check --matrix --integration-budget pasa sus comprobaciones y produce 24 PASS/1 INCONCLUSIVE (sin empates en la muestra), sin fallos/bloqueos locales. El reporte público de G1 conserva 15 bloqueos operativos y diez validaciones positivas; no se infiere integración del resultado MOCK.

Controles existentes de secretos/SAST/SCA PASS, sin altas/críticas ni vulnerabilidades runtime; once avisos moderados de desarrollo siguen sujetos a revisión de riesgos. Selección real/aprobación de grupo, revisión independiente, grants y SHA desplegado siguen pendientes. La issue permanece abierta y conserva responsable/revisor/DoD.

IA: Codex para implementación, pruebas y registro; no se atribuye aceptación humana independiente.
