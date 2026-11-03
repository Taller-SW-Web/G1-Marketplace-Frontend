# TASK-F007-QA-001 — avance verificado 03/11/2026

Responsable: Giuliano Macchiavello (`GiulianoMaPe`). [Issue #30](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/30). Rama `feat/giuliano-h4-issues-20261103`. Issue abierta; no se declara Terminado.

## Alcance y resultado propio

Probar 1 y 121 caracteres no consultan; query vacía vuelve catálogo; respuesta lenta anterior no reemplaza nueva; cero resultados conserva q y limpiar; incluir cada estado visual y transición documentada.

Añadida regresión de navegador por issue, comprobada por Next→BFF con fixtures MOCK.

- [tests/issues/issue-30.spec.ts](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/feat/giuliano-h4-issues-20261103/tests/issues/issue-30.spec.ts)

## Verificación ejecutada

`npm run test:components`: 334 PASS; `npm run test:server`: 81 PASS; typecheck/lint/build PASS. `node node_modules/@playwright/test/cli.js test tests/catalog.spec.ts tests/catalog-h4.spec.ts tests/issues --reporter=list`: 26 PASS con Edge y Next→BFF MOCK.

Se distinguen fixtures MOCK, contrato HTTP local/sintético y transporte REAL de demo. Los totales son de las suites indicadas, no cobertura certificada de todos los criterios de la funcionalidad.

Seguridad local: controles existentes de secretos/SAST/SCA PASS, sin altas/críticas ni vulnerabilidades runtime. El corte de desarrollo tiene 11 moderadas; requieren revisión de riesgos. SAST usa cuatro reglas locales. DAST de staging y aceptación independiente pendientes.

## Ensayo REAL local y despliegue

Fecha UTC del ensayo del adaptador: `2026-11-03T19:06:32.557Z`. Modo histórico `demo-no-auth`, sin JWT; presupuesto 20 s. El proceso de ensayo permitió únicamente el hostname de medios observado en el payload público de G6 (`slzglmtiyrzygpkiuthf.supabase.co`); no se cambió allowlist ni configuración de producción. No se atribuye homologación del host a G6/G7 ni aprobación humana.

```json
[
  {
    "name": "F007-search",
    "status": "PASS_DEMO_READ",
    "source": "REAL",
    "durationMs": 4548,
    "products": 4,
    "page": {
      "number": 0,
      "size": 4,
      "totalElements": 5,
      "totalPages": 2
    },
    "sort": null
  },
  {
    "name": "F007-empty",
    "status": "PASS_DEMO_READ",
    "source": "REAL",
    "durationMs": 534,
    "products": 0,
    "page": {
      "number": 0,
      "size": 4,
      "totalElements": 0,
      "totalPages": 0
    },
    "sort": null
  }
]
```

Sondeo público G1 del 03/11: home y búsqueda 503/CATALOG_UNAVAILABLE con UNCONFIGURED; filtros 404/NOT_FOUND. No se identifica el SHA desplegado. El adaptador local no acredita ese despliegue.

## Criterio pendiente para cerrar

DoD de la issue: Casos unitarios/componentes/API y E2E aplicables pasan con evidencias; pruebas mock y reales etiquetadas. Hallazgos corregidos/reprobados.

Acreditar identidad técnica/grants G1→G6/G7 y casos desde el corte G1 desplegado. El modo público demo-no-auth no sustituye esa identidad.

Nueva revisión independiente de estos cambios, publicación y prueba del SHA desplegado y dependencias OPS aplicables.

Backend #237 y SPECS #13 fueron aprobados por Leo y fusionados a develop el 01/11. Frontend #110 tiene aprobación de Sebastian y una solicitud de cambios anterior de Leo aún registrada. Esas revisiones corresponden a sus HEAD originales; no aprueban este nuevo corte. No se modifican revisores ni criterios de aceptación.

IA utilizada: Codex para revisar código, generar cambios/pruebas y este registro; lectura y ejecución técnica automatizadas. Revisión humana de Giuliano y revisor asignado pendiente. No se atribuye al autor aceptación independiente ni demostración de producción.
