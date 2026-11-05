# TASK-F006-FE-001 — avance verificado 03/11/2026

Responsable: Giuliano Macchiavello (`GiulianoMaPe`). [Issue #27](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/27). Rama `feat/giuliano-h4-issues-20261103`. Issue abierta; no se declara Terminado.

## Alcance y resultado propio

Implementar HomePageContainer, CategoryGrid, FeaturedProducts y todos los estados de React/UI.

Validación de Home contra categorías y destacados duplicados; se mantiene el vacío válido y la tarjeta sin imagen.

- [src/features/catalog/api.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/giuliano-h4-issues-20261103/src/features/catalog/api.ts)
- [tests/catalog/home-h4-issue27.test.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/giuliano-h4-issues-20261103/tests/catalog/home-h4-issue27.test.ts)

## Verificación ejecutada

`npm run test:components`: 334 PASS; `npm run test:server`: 81 PASS; typecheck/lint/build PASS. `node node_modules/@playwright/test/cli.js test tests/catalog.spec.ts tests/catalog-h4.spec.ts tests/issues --reporter=list`: 26 PASS con Edge y Next→BFF MOCK.

Se distinguen fixtures MOCK, contrato HTTP local/sintético y transporte REAL de demo. Los totales son de las suites indicadas, no cobertura certificada de todos los criterios de la funcionalidad.

Seguridad local: controles existentes de secretos/SAST/SCA PASS, sin altas/críticas ni vulnerabilidades runtime. El corte de desarrollo tiene 11 moderadas; requieren revisión de riesgos. SAST usa cuatro reglas locales. DAST de staging y aceptación independiente pendientes.

## Ensayo REAL local y despliegue

Fecha UTC del ensayo del adaptador: `2026-11-03T19:06:32.557Z`. Modo histórico `demo-no-auth`, sin JWT; presupuesto 20 s. El proceso de ensayo permitió únicamente el hostname de medios observado en el payload público de G6 (`slzglmtiyrzygpkiuthf.supabase.co`); no se cambió allowlist ni configuración de producción. No se atribuye homologación del host a G6/G7 ni aprobación humana.

```json
[
  {
    "name": "F006-home",
    "status": "PASS_DEMO_READ",
    "source": "REAL",
    "durationMs": 367,
    "categories": 8,
    "featured": 0
  }
]
```

Sondeo público G1 del 03/11: home y búsqueda 503/CATALOG_UNAVAILABLE con UNCONFIGURED; filtros 404/NOT_FOUND. No se identifica el SHA desplegado. El adaptador local no acredita ese despliegue.

## Criterio pendiente para cerrar

DoD de la issue: Props/eventos tipados, estado específico, sin requests internos navegador; desktop/mobile aplicables y casos de spec React cubiertos.

Acordar curaduría/campos de destacados con Jim/PO y G6. Home de demo devuelve categorías y cero destacados; no acredita el criterio de destacados.

Nueva revisión independiente de estos cambios, publicación y prueba del SHA desplegado y dependencias OPS aplicables.

Backend #237 y SPECS #13 fueron aprobados por Leo y fusionados a develop el 01/11. Frontend #110 tiene aprobación de Sebastian y una solicitud de cambios anterior de Leo aún registrada. Esas revisiones corresponden a sus HEAD originales; no aprueban este nuevo corte. No se modifican revisores ni criterios de aceptación.

IA utilizada: Codex para revisar código, generar cambios/pruebas y este registro; lectura y ejecución técnica automatizadas. Revisión humana de Giuliano y revisor asignado pendiente. No se atribuye al autor aceptación independiente ni demostración de producción.
