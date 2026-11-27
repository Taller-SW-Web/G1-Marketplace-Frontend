# H5 · O-008 desde el detalle del pedido

Candidato de pedidos de Fernando en `f555110`. Chrome local en la ruta normal de detalle, con `REORDER_UI_ENABLED=true` y respuestas HTTP sintéticas.

| Caso | Escritorio 1280 px | Móvil 390 px |
| --- | --- | --- |
| HTTP 503 sin resultado de reordenado | [Captura](1280-o008-error.png) | [Captura](390-o008-error.png) |
| Reintento, resultado parcial y detalle de líneas | [Captura](1280-o008-parcial.png) | [Captura](390-o008-parcial.png) |

Pasaron dos recorridos. Las solicitudes de reordenado conservaron la misma clave de idempotencia después del 503 y solo llamaron al endpoint de reordenado. El botón perdió el foco al deshabilitarse durante la solicitud. Se corrigió con el estado de carga de DS-001 que conserva el foco y bloquea activaciones repetidas. El diálogo enfoca su título, contiene la navegación por Tab y devuelve el foco al botón al cerrar con Escape.

Reproducción con Chrome y dependencias instaladas:

```bash
npx playwright test -c playwright.h5-reordenado-evidence.config.ts
```

Para acreditar el flujo integrado queda probar el candidato desplegado con un pedido de QA autorizado y registrar el resultado que devuelva el Backend.
