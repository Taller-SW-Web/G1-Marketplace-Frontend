# Verificación H4 conectada local

## Ejecutar

Requiere Node 22/24, Docker Desktop con contenedores Linux, dependencias de ambos repositorios y Edge local. En CI usa Chromium de Playwright (`npx playwright install --with-deps chromium`).

Desde el frontend:

```powershell
$env:H4_BACKEND_DIR='D:\Proyectos\G1-Marketplace\output\pr239-review'
npm run test:e2e:h4:connected
```

`H4_BACKEND_DIR` debe contener `scripts/h4-connected-server.ts` de la revisión backend. Al integrar ese archivo en el repositorio hermano habitual se puede omitir la variable. La implementación backend se encuentra en la rama local `fix/pr239-ci-connected`; los cambios frontend se añadieron preservando el trabajo sin confirmar existente.

El runner aplica migraciones dos veces en una base nueva, inicia Nest y Next en loopback, ejecuta Playwright y elimina sus procesos y contenedor incluso al fallar. No elimina volúmenes ni usa el compose compartido de H3. Las suites no escriben capturas en documentación versionada.

## Cobertura aprobada el 2026-11-02

Revalidación sobre la base de la PR frontend #118 (`bae0a17`): 256 pruebas de componentes, 95 de servidor y build de producción aprobados. Se conserva la autenticación incorporada en esa rama. Las rutas nuevas siguen siendo de prueba y no habilitan CSAT productivo.

Siete pruebas recorren navegador → rutas Next → controladores/servicios Nest → PostgreSQL. No hay page.route ni respuestas simuladas entre frontend y backend.

- Favoritos: guardar, listar, recargar, agregar al carrito conservando el favorito, verificar filas e ítems persistidos, lista vacía del segundo usuario y eliminar con 204.
- CSAT: confirmación 201, duplicado canónico 409, error 503 conservando el borrador y prompt SHOWN, pedido no entregado 422, pedido ajeno 403 y ausencia de prompt 409. Se verifica el mapeo GOOD/REGULAR/BAD a 5/3/1 y que los rechazos de elegibilidad no contacten el envío externo.

Identidad y catálogo son proveedores de prueba. Ventas/Postventa es un servidor HTTP loopback que ejercita el gateway real. Los prompts SHOWN los siembra el fixture en la base exclusiva; esto no acredita un productor de prompts real. Las respuestas auxiliares 503 del catálogo de la cabecera quedan fuera del alcance de esta suite.

## Rutas de prueba

La vista `/demo/h4/evaluacion/[orderId]` y el proxy `/api/h3/csat/[orderId]` requieren `H4_CONNECTED_TEST=true` y el sandbox frontend fuera de producción. El proxy conserva la sesión httpOnly, verifica origen y no reenvía tokens proporcionados por el navegador. La demo CSAT anterior sigue siendo simulada.

El backend de prueba solo se inicia con NODE_ENV=test, H4_CONNECTED_TEST=true y una URL de base local validada. Sus overrides no se importan desde el bootstrap normal. No se relaja la prohibición de habilitar CSAT real con identidad sandbox en la aplicación normal.

Esto acredita integración local de esta sección; no certifica G6/G7/Ventas reales ni un despliegue. Los E2E conectados usan configuración independiente y quedan excluidos de la suite Playwright predeterminada.
