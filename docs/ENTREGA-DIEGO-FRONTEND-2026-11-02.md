# Frontend de Diego — entrega visual validada

## Base y paquetes

Rama `feat/diego-h4-frontend-validado`, creada desde `origin/develop` en `0bca767`. Los cambios se trasladaron mediante merge de tres vías para preservar las incorporaciones recientes de autenticación y las vistas de otros responsables. El checkout original y su respaldo se conservan; no se publican prompts personales, node_modules, resultados de pruebas ni cambios generados en next-env.d.ts.

1. `0ba4518`: favoritos y adición al carrito. Proxy Next opcional, DTO validado, mensajes saneados, bloqueo por producto, resultado incierto sin reenvío automático, favorito y fecha conservados. Incluye pruebas y escenarios simulados.
2. `224ec35`: presentación CSAT. Invitación y modal, sentimientos, motivos contextuales de demostración y comentario; borrador privado por titular/pedido, manejo de error, duplicado y pérdida de elegibilidad. Incluye siete pruebas y comprobación móvil.
3. Documentación: contratos, reproducción, validación y límites de esta entrega.

## Validación

El solicitante revisó y aprobó visualmente favoritos/carrito, después CSAT y finalmente autorizó commits y PR. La validación visual ocurrió sobre el checkout local anterior a integrar el último develop. No sustituye homologación intermodular ni aprobación independiente.

Sobre la rama basada en develop actual:

| Control | Resultado |
|---|---|
| npm run test:components | 32 archivos, 256 pruebas aprobadas |
| npm run test:server | 5 archivos, 95 pruebas aprobadas |
| npm run build | Aprobado, incluida comprobación TypeScript y generación de rutas |
| npm run lint | Aprobado sin errores ni advertencias |
| git diff --check | Aprobado |

Se reutilizaron las dependencias instaladas del checkout original mediante junction local; no se ejecutó npm ci en este worktree. Los lockfiles y dependencias permanecen sin cambios. Los resultados son de suites completas, no exclusivamente del trabajo de Diego.

La comprobación móvil previa en Edge a 390 px validó apertura del modal, selección y envío confirmado con transporte simulado, sin desbordamiento horizontal. No se repitió E2E completa ni auditoría visual sobre develop actualizado. Los resultados históricos de Playwright no se presentan como una ejecución actual.

## Reproducir la revisión

Ejecutar `npm run demo:favoritos`. Abrir:

- `/demo/h3/favoritos/lista?estado=carrito`: agregar preservando favorito; selector con error de stock, resultado incierto, variantes y estados de consulta/eliminación.
- `/demo/h3/evaluacion`: pedido entregado, error de envío, duplicado, cambio de elegibilidad, no entregado y sesión cerrada.

El servidor de desarrollo usa 127.0.0.1:3200 por defecto. Los escenarios no modifican cuentas reales. Para comprobar modal móvil con el servidor activo: `node scripts/preview-csat-check.mjs`.

## Límites de integración

- El nuevo add-to-cart conserva su opt-in `H3_WISHLIST_CART_ENABLED`; el adaptador nuevo sigue usando sandbox local. El develop actualizado incluye autenticación real para otros recorridos, pero esta entrega no homologa carrito y favoritos con una misma sesión real.
- CSAT implementa presentación y transporte inyectable de demostración. No incluye proxy real de envío, lectura de elegibilidad ni productor de prompts. No se muestra automáticamente en historial o confirmación de pago.
- Motivos del demo no representan un catálogo homologado. Cerrar/posponer no persiste DISMISSED. Solo resultados explícitos submitted/duplicate producen agradecimiento.
- Permanecen pendientes integración real G7/G6/G5, identidad compartida, datos de catálogo y carrito, contrato de prompt, pruebas desplegadas y revisión independiente.

Referencias: Frontend #87–#96. Avance de implementación y QA local; no cierre automático de issues ni merge autorizado. Las tareas transversales #97/#102/#103 no se declaran completadas.

Los documentos históricos de conexiones describen su corte y pueden mencionar limitaciones de login ya modificadas por develop. Este documento define el estado y las limitaciones actuales de la publicación.
