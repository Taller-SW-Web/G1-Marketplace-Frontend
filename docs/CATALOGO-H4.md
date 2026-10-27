# Catálogo H4 — controles, pruebas y límites

Giuliano, 26/10/2026, rama `feat/giuliano-hito4`. F-006–F-010. Implementación preparada con Codex; revisión humana de Sebastian y aceptación del equipo pendientes.

## Comportamiento implementado

- Filtros por una categoría, una marca y rango PEN, sobre maestros del BFF `GET /api/v1/catalog/filters`; se conservan nombres de claves `categoryIds`/`brandIds`. El contrato publicado de G6 es singular: CSV y repetidos no se habilitan. La proyección de maestros es aditiva G1 y requiere revisión de API.
- El formulario mantiene un borrador: sólo Aplicar modifica URL/resultados. Limpiar vacía el borrador; quitar chips o Limpiar filtros actúa sobre los criterios aplicados sin perder búsqueda ni orden.
- Mobile usa un diálogo modal nativo con foco, Escape/Cerrar, fondo inerte y devolución al disparador. Cancelar descarta el borrador. Aplicar devuelve foco al encabezado tras cargar resultados. Patrón visual definitivo O-001 pendiente de aprobación.
- Orden por nombre A→Z/Z→A delegado al proveedor. No se ofrecen precio/relevancia/novedad. Cambiar búsqueda, filtros u orden reinicia página; paginar conserva el contexto completo en URL.
- Página visible uno basada y API cero basada. Fuera de rango: recuperación explícita a primera página con criterios conservados, sin bucle automático. Validación de claves, duplicados, enteros, límites, filtros y rango antes de pedir productos.
- Validación de DTO y metadatos coherentes; respuesta anterior cancelada/ignorada; estados carga/vacío/error/reintento y errores de maestros separados de los productos.

## Verificación local del corte

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, sin errores; warning previo de dependencias de efecto en `OrdersHistory.tsx` |
| `npm run test:components -- --maxWorkers=2` | 225 pruebas PASS en 28 archivos |
| `npm run test:server` | 73 pruebas PASS en 4 archivos |
| `npm run build` | PASS, Next compilado |
| `npx playwright test tests/catalog.spec.ts tests/catalog-h4.spec.ts tests/catalog-visual-h4.spec.ts` | 21 recorridos PASS contra Next y BFF locales en MOCK; incluye revisión propia posterior |

Los recorridos incluyen regresión H3, filtros combinados, conservación de búsqueda/orden, borrador móvil/Escape/foco, orden global entre páginas, recuperación de página y error/reintento de maestros. Los primeros intentos detectaron esperas de URL y selectores ambiguos en las pruebas nuevas; se corrigieron y el recorrido completo pasó. Las capturas se producen en `test-results`, fuera de Git.

Estas pruebas no acreditan integración REAL, credenciales técnicas, revisión independiente, cumplimiento visual definitivo ni despliegue de esta rama. El contrato de maestros, multiselección, curaduría de destacados y las dependencias de ficha/favoritos conservan sus revisiones/gates. El token de Productos permanece en Backend; el navegador usa exclusivamente el proxy Next.

## Verificación final de seguridad y CI

El 26/10/2026 pasaron los controles existentes de Gitleaks 8.30.1 y Semgrep 1.181.0: detectores con controles positivos, fuente/historial/artefacto, cuatro reglas SAST y auditoría runtime/dev sin vulnerabilidades. Informes locales en `.local-security`. happy-dom se actualizó exactamente a 21.0.4 para corregir [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79); componentes/tipos/lint/build y 17 recorridos de navegador pasaron tras el ajuste de foco. El workflow H4 valida esta rama al hacer push; no despliega. Su resultado remoto y el CD del corte aprobado deben verificarse aparte. [Evidencia SPECS](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/blob/feat/giuliano-hito4/plan/evidencias/H4-GIULIANO-2026-10-26.md).

## Revisión propia posterior de UI y foco

La revisión del 26/10 comparó inicio/catálogo desktop y mobile con los nodos Figma 274:111, 274:293, 339:881 y 339:1026 del archivo `k6JZRdgbO7YtZXeFqygE8p`. Se ajustaron marco/jerarquía del panel, barra de conteo/orden, ancho de controles mobile e iconos exactos de la referencia. El disparador de filtros queda sólo en mobile. El contador y resumen accesible reflejan criterios aplicados, incluido mínimo cero.

Se corrigió la pérdida de foco al quitar búsqueda y al aplicar un borrador sin cambios. Los cuatro casos nuevos comprueban esos defectos, geometría responsive y estados error/vacío, junto a las regresiones existentes. Se ejecutaron nuevamente build y los 21 recorridos; componentes (225), tipos y lint pasaron en esta revisión. Las 73 pruebas de servidor corresponden al corte previo, sin cambios de servidor en esta revisión.

Capturas sintéticas en `test-results/h4-visual-*.png`, ignoradas por Git y adjuntas al artefacto de CI. No constituyen comparación automática pixel a pixel ni aprobación humana. No se localizó un frame O-001 en las páginas de catálogo/overlays consultadas; su revisión de comportamiento usa la spec. No se habilitaron campos u órdenes sin soporte del contrato. Las aprobaciones de diseño, curaduría e integración REAL siguen pendientes.

## Demo de catálogo reproducible

```sh
npm run demo:catalogo:h4
```

Compila ambos repos hermanos con dependencias previamente instaladas, arranca Next en `http://127.0.0.1:3500` y BFF MOCK en 10500, y comprueba home/maestros/búsqueda por el proxy. No usa Docker ni credenciales reales, no modifica `.env` y no escribe en BD. Informa puertos ocupados sin detener procesos ajenos. Ctrl+C cierra sus procesos. `/live` sólo acredita vida, no readiness de BD.

`npm run demo:catalogo:h4 -- --check` ejecuta el smoke y sale; `--skip-build` permite reutilizar builds actuales. El smoke con builds actuales pasó. Esta demo sintética no acredita integración G6/G7 ni despliegue.
