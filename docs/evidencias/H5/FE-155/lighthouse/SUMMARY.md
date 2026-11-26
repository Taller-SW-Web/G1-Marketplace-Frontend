# Lighthouse H5 · FE #155

- **Fecha:** 2026-11-26T06:36:51.692Z
- **Commit:** `93fdc79f9e2c52eee4ff29ac80f107c9e9b0821e`
- **Base URL:** https://g1-marketplace-frontend.vercel.app
- **Umbrales:** rendimiento ≥90, accesibilidad ≥90, buenas prácticas ≥90, SEO ≥90
- **Emulación:** móvil 390×844, DPR 3, throttling móvil de Lighthouse
- **Ejecución:** Lighthouse móvil contra el sitio desplegado; sin build local.
- **Workflow de despliegue:** https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/actions/runs/45766627066

| Ruta | URL exacta | Hora (UTC) | Rendimiento | Accesibilidad | Buenas prácticas | SEO | Estado |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| inicio | https://g1-marketplace-frontend.vercel.app/ | 2026-11-26T06:35:12.319Z | 100 | 100 | 96 | 100 | ✅ cumple |
| catalogo | https://g1-marketplace-frontend.vercel.app/catalogo | 2026-11-26T06:35:34.492Z | 84 | 100 | 96 | 100 | ❌ revisar |
| ficha | https://g1-marketplace-frontend.vercel.app/productos/producto-demostracion-4 | 2026-11-26T06:35:53.860Z | 86 | 100 | 96 | 100 | ❌ revisar |

## Rutas por debajo del umbral

### catalogo (`/catalogo`)

- performance: 84 < 90

### ficha (`/productos/producto-demostracion-4`)

- performance: 86 < 90

## Artefactos

- `lh-<ruta>.report.json` y `lh-<ruta>.report.html`: reporte completo.
- `capturas/<ruta>-movil.png`: captura de referencia del mismo corte.
- La hora y URL exactas de cada auditoría están en la tabla y en `scores.json`; el SHA se confirma con el workflow de despliegue enlazado arriba.
