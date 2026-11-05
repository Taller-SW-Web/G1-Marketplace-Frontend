# Catálogo REAL local y ficha MOCK — demo del 06/11/2026

El listado consume G6 mediante navegador → Next → BFF G1 → G6, con su modo demo sin JWT autorizado para el ensayo. La ficha MOCK se muestra en otra pestaña y servicio, con rótulo visible. No hay fallback entre productos REAL y fixtures.

## Preparación en otra máquina

Requisitos: Git, Node **22.18 o superior de la rama 22**, npm y acceso HTTPS a GitHub, G6 y el host de imágenes. No requiere Docker, PostgreSQL, token ni archivos privados. La primera instalación necesita Internet.

En una carpeta nueva, clonar ambos repositorios como hermanos:

```sh
git clone --branch develop https://github.com/Taller-SW-Web/G1-Marketplace-Backend.git
git clone --branch develop https://github.com/Taller-SW-Web/G1-Marketplace-Frontend.git
cd G1-Marketplace-Backend
npm ci --no-audit --no-fund
cd ../G1-Marketplace-Frontend
npm ci --no-audit --no-fund
npm run demo:catalogo:real
```

Hasta que esta PR se integre, después de clonar Frontend seleccionar `git switch chore/catalogo-real-local-develop` antes de `npm ci`. Backend puede permanecer en `develop`.

El comando construye ambos proyectos y comprueba una búsqueda real. Abrir <http://127.0.0.1:3540/catalogo?q=Nike&pageSize=4&sort=NAME_ASC>. Ctrl+C detiene sólo los procesos creados por el runner. No inicia migraciones ni cambia variables de Render. Si un puerto está ocupado, detener el demo anterior; el runner falla explícitamente.

Comprobación que termina sola, construyendo desde fuentes:

```sh
npm run demo:catalogo:real -- --check
```

Para repetir sin reconstruir, sólo después de construir ese mismo corte: añadir `--skip-build`. El script está en [demo-catalog-real.mjs](../scripts/demo-catalog-real.mjs); no usa rutas de usuario, Temp, archivos privados ni dependencias copiadas. Sus entornos de procesos hijo están explícitos y no heredan tokens o URLs de nube del shell.

## Variables exactas inyectadas

No hace falta crear un `.env`. El runner establece estos valores en su Backend local:

```dotenv
NODE_ENV=test
PORT=10640
CATALOG_SOURCE=real
CATALOG_INTEGRATION_APPROVED=true
PRODUCTOS_BASE_URL=https://g6-productos-ofertas.duckdns.org
PRODUCTOS_AUTH_MODE=demo-no-auth
PRODUCTOS_SERVICE_TOKEN=
PRODUCTOS_CONTRACT_VERSION=0.6.0-rc.1
PRODUCTOS_CONTRACT_SHA=f64bfe9a097b2a0f74c2600988305443d92f640e
PRODUCTOS_MEDIA_HOSTS=slzglmtiyrzygpkiuthf.supabase.co
PRODUCTOS_TIMEOUT_MS=15000
CATALOG_FEATURED_ENABLED=false
CATALOG_FEATURED_APPROVED=false
CATALOG_HOME_FALLBACK_ENABLED=false
CATALOG_FEATURED_IDS=
BFF_MODE=real
USE_MOCKS=true
ORDERS_SOURCE=unconfigured
AUTH_ENABLED=false
G1_AUTH_ENABLED=false
G7_REGISTRATION_ENABLED=false
G7_RECOVERY_ENABLED=false
G7_INTROSPECTION_ENABLED=false
H3_SANDBOX_ENABLED=false
H3_AUTH_MOCK=false
DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/local_catalog_readonly
CORS_ORIGINS=http://127.0.0.1:3540
CORS_ALLOWED_ORIGINS=http://127.0.0.1:3540
```

La URL PostgreSQL es sintética y apunta al puerto cerrado 1: no es una credencial real ni una BD disponible. El ensayo se limita a lecturas de catálogo. `USE_MOCKS` aísla otras dependencias locales; el listado sigue siendo REAL por `CATALOG_SOURCE`. La aprobación es del ensayo local y no acredita grant ni aceptación de producción. Los flags de login sólo afectan estos procesos de demo, no el acceso de un entorno compartido.

Next recibe:

```dotenv
NODE_ENV=production
MARKETPLACE_API_URL=http://127.0.0.1:10640
CATALOG_BFF_TIMEOUT_MS=18000
NEXT_TELEMETRY_DISABLED=1
G1_AUTH_ENABLED=false
H3_FRONTEND_SANDBOX_ENABLED=false
```

Ese NODE_ENV corresponde al build optimizado de **Next local**. El Backend de demo conserva test. No hay token en el navegador ni `NEXT_PUBLIC_*` para G6. No modificar `.env` de producción.

## Redes con inspección TLS y ensayo desde otra red

El revisor reportó que un firewall de su red re-firmaba el certificado HTTPS de G6. Si Node no confía en esa cadena, el catálogo puede terminar en 503 aunque los mismos datos funcionen desde otra red. No atribuir todo 503 a TLS: la ficha REAL también tiene su 503 propio por el adaptador pendiente.

Antes del demo, ejecutar:

```sh
npm run check:g6:network
```

El diagnóstico hace un único GET público a G6, sin JWT, con validación TLS obligatoria y timeout de 15 s. Imprime estado HTTP, duración, correlación y metadatos públicos del certificado (emisor, sujeto, huella y vigencia); no imprime cuerpos ni credenciales. `TLS_ERROR` con códigos como `SELF_SIGNED_CERT_IN_CHAIN` o `UNABLE_TO_VERIFY_LEAF_SIGNATURE` identifica una cadena no confiable; `TRANSPORT_ERROR` y un HTTP 503 requieren su diagnóstico propio. No usar `NODE_TLS_REJECT_UNAUTHORIZED=0`, `curl -k` ni desactivar validación. El script rechaza ese bypass.

Si falla sólo en la red inspeccionada, repetir el mismo comando y `npm run demo:catalogo:real -- --check` desde hotspot u otra red. Cualquier CA corporativa necesaria debe provenir del administrador autorizado y configurarse explícitamente para Node; el runner filtra el entorno heredado, de modo que la confianza del navegador o una variable de CA del shell no demuestra la confianza del proceso Backend hijo.

También hay un ensayo **manual**, sin acceso a producción, en GitHub Actions: workflow **H3 Frontend**, seleccionar esta rama y activar `real_demo_network`. Usa un runner nuevo Ubuntu de GitHub, Node 22.18, Backend develop fijado y la guía/runner de esta PR. Primero comprueba TLS directo, luego instala dependencias, construye Next/BFF y ejecuta el catálogo REAL con `--check`. No entrega credenciales ni modifica certificados o Render. Esa ejecución acredita una red distinta de esta máquina; no sustituye la prueba en la red del revisor ni identifica por sí sola el firewall responsable.

## Qué comprobar en el navegador

1. Buscar Nike y observar las tarjetas y sus imágenes. La respuesta `/api/catalog/products?q=Nike&pageSize=4&sort=NAME_ASC` debe tener HTTP 200 y `X-Catalog-Source: REAL`; el listado no declara `meta.source`.
2. Cambiar nombre ASC/DESC, página y categoría. Los tiempos y disponibilidad dependen de G6.
3. Las imágenes deben provenir del **host exacto** configurado; nunca usar `*.supabase.co`. ProductCard y ProductGallery usan img nativo, por lo que no necesitan Next remotePatterns.
4. Marcas y precio han presentado 503 y se muestran como errores. El demo no los reemplaza por datos falsos. Los destacados/ranking REAL están desactivados.

## Ficha MOCK separada

En otra terminal, desde el mismo Frontend:

```sh
npm run demo:catalogo:h4 -- --featured
```

Este comando construye y levanta otros procesos: BFF 10500 y Next 3500. Abrir <http://127.0.0.1:3500/productos/producto-demostracion-7> para «Disponibilidad por confirmar», reintento y sin compra; o <http://127.0.0.1:3500/productos/zapatillas-running-aero-x> para ficha comercial. El rótulo MOCK debe estar visible. **En Windows, detener primero el demo REAL antes de reconstruir el mismo Backend**, porque Prisma mantiene abierta su DLL; después se puede reiniciar REAL con `--skip-build`.

No existe equivalencia automática entre un producto G6 y un fixture: cambiar de pestaña de forma explícita. Una tarjeta REAL abre su ficha REAL y actualmente puede recibir 503; no prometer un recorrido completo REAL.

## Detalle G6 y causa del 503 G1

G6 sí publica `GET /api/v1/productos/por-slug/{slug}?canal=MARKETPLACE`, operación `obtenerProductoPorSlug`, scope contractual `catalogo:leer`. Se observó 200 sin JWT para `nike-academy-hv4386-100` el 05/11. [Contrato G6 consultado](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-docs/blob/a7778ec1a22811c1213a94ef096ab905911342cc/contratos/http/openapi.yaml).

En Backend develop v1.4.0, `ProductDetailService.getBySlug()` conserva un TODO: con `BFF_MODE=real` lanza 503 `PRODUCT_CATALOG_UNAVAILABLE` antes de llamar a G6. Falta el adaptador G1 y su mapeo/validaciones; no lo resuelven el token, la allowlist de imágenes o el timeout. Precio, variantes y disponibilidad REAL son adaptadores separados. Además, el GET observado devuelve atributos con `nombre`, `valor_id` y `valor: { valor_id }`, sin texto legible del valor: falta resolver ese mapeo sin mostrar IDs como especificaciones. El transporte de F-011 es técnicamente viable, pero la ficha completa no se entrega como REAL en esta PR. La ficha del viernes permanece MOCK mientras su integración no esté implementada, probada y revisada.

## Producción y pendientes externos

- La confirmación del almacenamiento oficial y estabilidad de `slzglmtiyrzygpkiuthf.supabase.co` está [solicitada a G6](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/pull/137#issuecomment-6662707341). Sin respuesta al corte del 05/11 a las 18:00 Lima, **host sólo para demo local**. No inferir aprobación por silencio.
- El [token técnico G1→G6 y los grants](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/213) siguen sin provisión/verificación acreditada. No solicitar activación REAL de producción a Andrés hasta que exista el token y se verifique el acceso. Nunca enviarlo por chat o Git.
- Producción mantiene NODE_ENV=production. `CATALOG_SOURCE=mock`, `USE_MOCKS=true` y `demo-no-auth` permanecen prohibidos ahí. Cualquier MOCK alojado requiere **otro entorno**, coordinado con Andrés; este comando sólo inicia procesos locales.
- `/live` prueba proceso; la BD ficticia hace que `/ready` no certifique disponibilidad. El demo tampoco acredita grants, despliegue o todos los filtros de G6.

## Ensayo y alcance de reproducibilidad

Base: Backend develop `3c6bc6c5755185f47eb13d98ed4bba80846f13e1` (v1.4.0) y Frontend develop `28f4bb0` (v1.3.0). Se ensaya en clones recién descargados, sin node_modules, .next, dist ni .env copiados; dependencias instaladas desde lockfile y builds nuevos. Esta preparación en un directorio limpio de la misma máquina no constituye una segunda máquina física. El ensayo en la máquina del revisor sigue pendiente hasta que ejecute estos pasos y comparta su resultado.


Resultados del ensayo del 05/11: `npm ci` y builds nuevos de ambos proyectos PASS; `demo:catalogo:real -- --check` obtuvo HTTP 200, fuente REAL y cuatro productos. Tres tests del runner sin red, lint y tipos PASS. Componentes/proxy: 381 PASS; servidor: 81 PASS. Edge: 41 recorridos de catálogo/ficha/comercio MOCK y cinco de destacados PASS. En un ensayo separado de imágenes, catálogo REAL decodificó una imagen G6 de 700×700; la galería la decodificó usando un fixture MOCK explícito. La consulta de ficha REAL devolvió 503: no se atribuye integración REAL a esa galería ni a la ficha completa. Los workflows fijan el Backend integrado `3c6bc6c5755185f47eb13d98ed4bba80846f13e1`, cuya compatibilidad con este Frontend se ensayó localmente.
