# Evidencia local — Checkout F-022–F-024 (Frontend)

- Base de trabajo: PR #108, rama `test/checkout-f022-f024`, basada en `develop`.
- Alcance implementado: componentes tipados para selección/captura de dirección, contenedor de cotización/resumen y formulario/beneficio; el flujo mantiene las llamadas API y coordina sus estados.
- Casos cubiertos: conservar campos tras 400; retirar direcciones ante 401; invalidez de cotización al cambiar dirección; explicar carrito cambiado; no presentar 503 como envío gratis; bloquear cotización vencida; 422 conserva el resumen; quitar beneficio solicita cotización fresca; respuesta tardía no reemplaza la cotización actual.
- Responsive: smoke de dirección y resumen a 375px y 1280px, sin desbordamiento horizontal.
- Validación local: `npm run typecheck` aprobado; `npm run test:components` 27 archivos / 211 pruebas aprobados; `npm run test:checkout:e2e` 3 aprobados / 1 omitido (smoke Backend MOCK opt-in); `npm run lint` sin errores y con una advertencia preexistente en `src/features/orders/OrdersHistory.tsx`; `git diff --check` aprobado.
- Límites: pruebas con fixtures/dobles y smoke MOCK opt-in; esto no acredita integración REAL, despliegue ni gates intermodulares. No cerrar #59–#64 ni tareas INT con esta evidencia local.
