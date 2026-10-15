# Catálogo S1 — F-006 / F-007 — Giuliano

Corte local parcial de inicio y búsqueda según las specs G1. No es un diseño aprobado en Figma ni una integración REAL con Productos. El código se encuentra en la rama local `feat/s1-f006-f007-catalogo`, creada desde main porque el checkout no publicaba develop. No se creó develop por cuenta del autor. Por instrucción actualizada de Giuliano, se crean commits y se sube esta rama de trabajo al remoto, sin publicar a main ni abrir PR; Giuliano preparará el PR manualmente al terminar.

## Ejecutar localmente

Requisito: Node.js 22.18 o posterior. En una terminal dentro de Backend:

```powershell
npm ci
$env:CATALOG_SOURCE = 'mock'
npm start
```

En otra terminal dentro de Frontend:

```powershell
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. La URL local del BFF predeterminada es http://127.0.0.1:10000. Para cambiarla, copiar `.env.example` a `.env.local` y configurar `MARKETPLACE_API_URL`. Esa variable se usa sólo en el servidor Next, nunca es `NEXT_PUBLIC`.

## Verificaciones

```powershell
npm run lint
npm run typecheck
npm run test:components
npm run build
npm run test:e2e
```

`test:e2e` primero construye el frontend. Las pruebas de navegador utilizan Microsoft Edge instalado (canal `msedge`) y levantan sus propios servidores: frontend compilado 3100 y BFF 10100. Se detienen al finalizar. No reutilizan servidores ajenos. Reporte local ignorado en Git: `playwright-report/`; capturas/trazas: `test-results/`. Son pruebas `MOCK` del recorrido web→Next→BFF, más fallos controlados en navegador; no llaman a G6 real. El proxy exige HTTPS salvo loopback, permitido para un BFF en la misma máquina.

## Implementado

- `/`: cabecera, búsqueda, categorías cargadas por API, inicio vacío/error y destacados omitidos sin selección homologada.
- `/catalogo`: consulta en URL, validación 2–120 caracteres, normalización, resultados, vacío, carga y recuperación de error.
- Criterio por categoría desde home y limpieza; consulta aplicada separada del texto en edición.
- Paginación básica con `page=0`, 24 elementos, límites, reinicio al buscar y foco al actualizar página.
- Requests anteriores abortados; errores y datos validados en el límite HTTP.
- Proxy server-only `/api/catalog/home|products` hacia las rutas BFF de Marketplace; no es una ruta del proveedor G6.
- Componentes base Button/TextField/EmptyState/Skeleton/LoadingState integrados en búsqueda, recuperación, vacíos y carga.
- Inter/Oswald servidas localmente; tokens DS-001 v0.2.0, diseño responsive y navegación con teclado.
- Logo Ink local provisto por SPECS. SVG de productos expresamente sintéticos, usados sólo en el catálogo MOCK.
- Banner visible cuando la respuesta declara `MOCK`. Datos de prueba nunca se presentan como integración real.

## Límites para la revisión

- F-008 (panel completo/marcas/precio/O-001), selector F-009 y aceptación integral F-010 siguen pendientes de S2. La paginación de este corte es avance preparatorio.
- El contrato candidato G6 del primer corte no trae precios/stock ni nombre de marca. No se muestran importes ficticios ni disponibilidad inventada. La tarjeta comercial completa requiere acuerdo y posterior enriquecimiento.
- El enlace de tarjeta y `returnTo` son el handoff de F-011 a Sebastian: `/productos/{slug}` aún no tiene implementación. La 404 general conserva salida al catálogo; la navegación completa de ficha no se declara terminada.
- Favoritos, sesión, carrito y sus controles no se simulan. Se integrarán con sus responsables.
- Header, footer y texto editorial son propuesta local para revisar G-SHELL; no se declara un frame Figma verificado ni pixel fidelity.
- UI kit pendiente: se utilizan HTML semántico y CSS con tokens, sin instalar una segunda biblioteca ni fijar Mantine/shadcn como decisión del equipo.
- El código se publica únicamente en la rama de trabajo. No se desplegó ni se cerraron INT/H3; el PR queda a cargo de Giuliano al terminar.

## Organización y handoff

`src/features/catalog` contiene DTO, validador HTTP, hook y componentes. `src/shared/ui` conserva shell/feedback. `src/theme/tokens.css` traduce DS-001; `globals.css` define esta propuesta visual. El contenedor consulta y los componentes de tarjeta presentan datos; no contienen reglas de precio, stock ni autorización.

Sebastian revisa implementación y recibe ProductCard/DTO/returnTo; Fernando revisa la propuesta visual de V-005/V-006; Leonidas revisa contrato backend; Andres integra despliegue; Diego verifica y Jim acepta. La nota de evidencia individual está en SPECS y enlaza los commits publicados en la rama; revisión humana y PR manual posterior a cargo del equipo/Giuliano.

Referencias: [Next App Router](https://nextjs.org/docs/app/getting-started/installation), [route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), y specs del repositorio G1-Marketplace-SPECS. Las versiones npm están fijadas en package.json y package-lock.json.

## Elementos compartidos

Consultar la [guía de elementos compartidos](ELEMENTOS-COMPARTIDOS.md) para contratos, consumo, ownership y límites del corte.
