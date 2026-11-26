# Lighthouse H5 · FE #155

- **Fecha:** 2026-11-25T01:17:26.390Z
- **Commit:** `6c25364e2a461d360f7130be29a3a6284e4a5698`
- **Base URL:** http://127.0.0.1:3106
- **Umbrales:** rendimiento ≥90, accesibilidad ≥90, buenas prácticas ≥90, SEO ≥90
- **Emulación:** móvil 390×844, DPR 3, throttling móvil de Lighthouse
- **Ejecución:** `npm run build && npm run start -- --port 3106` + `npm run lighthouse:h5`

| Ruta | Rendimiento | Accesibilidad | Buenas prácticas | SEO | Estado |
| --- | ---: | ---: | ---: | ---: | --- |
| inicio (`/`) | 73 | 100 | 96 | 100 | ❌ revisar |
| catalogo (`/catalogo`) | 89 | 100 | 96 | 100 | ❌ revisar |
| ficha (`/productos/producto-demostracion-4`) | 84 | 100 | 96 | 100 | ❌ revisar |

## Rutas por debajo del umbral

### inicio (`/`)

- performance: 73 < 90

### catalogo (`/catalogo`)

- performance: 89 < 90

### ficha (`/productos/producto-demostracion-4`)

- performance: 84 < 90

## Artefactos

- `lh-<ruta>.report.json` y `lh-<ruta>.report.html`: reporte completo.
- `capturas/<ruta>-movil.png`: captura de referencia del mismo corte.
- El run no acredita por sí solo el SHA desplegado en un entorno público; esa confirmación corresponde a Operaciones.
