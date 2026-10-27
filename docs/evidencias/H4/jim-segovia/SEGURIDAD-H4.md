# H4 — seguridad de F-001–F-005

21/10/2026. Responsable Jim Segovia; revisor Andrés Morales. Codex asistió implementación y ejecución; aprobación humana pendiente. Esta evidencia amplía las pruebas funcionales, sin cerrar integración REAL ni DAST en staging.

## Corte y resultado

Workflow `c007b23`, clasificación de claves y controles `2b2bdf5`. [CI 39687299631 PASS](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/actions/runs/39687299631), merge de prueba `d8a7c51f5f67649ca4053683b0a9fb567736ac41`, base `1f22cf0`. [Resumen sanitizado](seguridad/summary.json) e [inventario de licencias](seguridad/licenses.json) descargados de ese run; sin valores de claves.

| Comprobación | Resultado y alcance |
|---|---|
| Gitleaks 8.30.1 | Fuente, historia PR y build completo `.next` PASS; control positivo de secreto sintético PASS |
| Semgrep 1.181.0 | 121 archivos de src/scripts, cuatro reglas locales: ejecución dinámica, HTML peligroso, TLS desactivado y shell. PASS sin hallazgos/errores |
| SCA npm | Runtime y runtime/dev: 0 avisos |
| Licencias | Inventario de 268 paquetes, sin aprobación legal automática |
| Claves privadas Next | Cinco controles Python con scanner real PASS en local y CI; ocho campos clasificados; sin exposición de esos valores en `.next/static` ni `public` |

## Hallazgo y tratamiento

El [run inicial 39686630104](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/actions/runs/39686630104) falló por claves de preview/Server Actions generadas al construir Next. Se contrastaron los productores instalados `next/dist/build/preview-key-utils.js` y `next/dist/server/app-render/encryption-utils-server.js` de Next 16.4.1. Son parte del runtime privado; no se publican como assets/evidencias.

La política mantiene escaneo de todo el build: sólo `generic-api-key` clasifica un valor exacto en una ruta exacta de metadata privada, condición AND y formato validado. No excluye archivos completos ni modifica source/history. Cambio de versión/formato exige revisión. El TOML efímero con valores se elimina al terminar; CI publica sólo resumen/inventario durante siete días.

Controles: clave privada esperada clasificada; la misma clave en bundle público falla; otro secreto dentro de la metadata falla; exposición en `public` se reporta; versión/formato inesperados fallan. La búsqueda adicional de valores en assets no depende del contexto que reconozca el detector genérico. No acredita custodia del build privado en hosting: verificar al desplegar.

## Límites

Semgrep cubre las cuatro reglas del repositorio, sin taint/interprocedimental ni certificación completa. Windows/WSL local agotó tiempo en SAST y no se cuenta como PASS; la evidencia válida es CI Linux. Build limpio y comprobación local de artefactos PASS.

Faltan revisión independiente de política/código, DAST en staging propio autorizado, G7 REAL/cuentas A-B, BFF desplegado, migraciones y logs. El sitio público no se escaneó por inferencia de permiso. QA-002 permanece En progreso; este baseline no cierra la función.
