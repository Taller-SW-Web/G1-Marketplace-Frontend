# Integracion de Sebastian — H3 — 17/10/2026

Rama de origen: feat/h3-f011-f015-detalle-de-producto, revision 25778e1. Destino: rama personal feat/s1-f006-f007-catalogo. Se conserva el historial y no se modifica la rama de Sebastian, main ni develop.

Se integra el helper bff-proxy de Sebastian con correlacion y errores propios Problem Details. El conflicto de route.ts se resuelve delegando en ese helper, que reutiliza marketplaceApiUrl para conservar HTTP interno Docker explicitamente autorizado, rechazo de URLs inseguras y politica de redirecciones. El gate server-side de ficha conserva el mismo helper de origen. El CTA Agregar al carrito de Sebastian solo confirma una demostracion visual: no llama al carrito, no crea items y no completa checkout. Se mantienen las suites combinadas, la sesion anonima y el control de seguridad determinista.

Las comprobaciones y revisiones finales se consolidan en SPECS. Las pruebas usan copias aisladas sin .env privados y datos sinteticos. G6 REAL y la aceptacion humana conservan sus propias evidencias. El PR personal permanece draft hacia develop.

CI fija el Backend integrado 1507766823466448737d3b1ed046a669794f8bd6 y ejecuta navegador, seguridad y las siete comprobaciones Docker contra esa revision. Las pruebas locales de componentes/rutas y servidor aprobaron 185 + 41 casos; lint no tiene errores, con una advertencia heredada en OrdersHistory.
