# TASK-F014-QA-001 — prueba del cuarto estado de extremo a extremo

[Issue #44](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/44). Se añaden 13 casos de componentes/adaptador: 200 indeterminado, texto/icono/reintento, flujo de comercio sin compra, rechazo de estados no públicos/campos internos/SKU ajeno y preservación de error 503.

El stub de componentes y el backend MOCK usan `producto-demostracion-7` con `UNDETERMINED`. El nuevo recorrido Playwright solicita realmente la ficha a Next y reconsulta disponibilidad vía BFF local. Verifica texto, ausencia de compra/agotado, nueva respuesta 200 y proyección sin datos internos. No intercepta la respuesta HTTP en el navegador ni llama G6 remoto.

Resultado: 240 componentes/proxy, 73 servidor y cinco recorridos comerciales de navegador PASS. Compilación/tipos PASS; lint sin errores y un warning previo de OrdersHistory. El backend compañero pasa 203 unitarias y 32 HTTP comerciales. Son suites de esta base comercial, distintas de los totales F-006–F-010 del otro PR.

La CI del nuevo aporte fija por SHA el backend compañero; evita ejecutar la ficha nueva contra un backend sin el cuarto estado. El grant real y las pruebas en el despliegue siguen pendientes.

## Límites y revisión

Este aporte de Giuliano continúa las ramas de Sebastián; no modifica asignación ni revisor de la issue. Se mantiene separado de las entregas F-006–F-010. No se afirma aprobación humana, identidad G7, integración REAL ni despliegue. No se ejecutaron reservas, consumo de cupón ni operaciones contra servicios remotos.

La issue conserva su DoD y permanece abierta. Faltan revisión independiente del nuevo corte, integración autorizada y comprobación del SHA desplegado. IA: Codex para implementación, pruebas y registro; revisión humana pendiente.
