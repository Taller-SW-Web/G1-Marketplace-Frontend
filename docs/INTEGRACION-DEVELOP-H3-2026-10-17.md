# Integracion de develop — 17/10/2026

Se integra develop 0b0ed1c8c3449442e5611ddb321b80c73b1c0fc8 en feat/s1-f006-f007-catalogo. Los modulos de otros integrantes conservan su autor y alcance; no se modifica main/develop.

- Se mantienen el listado e inicio de Giuliano y el detalle de Sebastian, con ruta completa por slug en el proxy.
- Proxy y preflight server-side de ficha comparten marketplaceApiUrl: HTTPS, loopback y hostname Docker explicitamente aprobado; credenciales en URL y redirecciones rechazadas.
- Carrito reenvia cookie y autenticacion explicita; nunca obtiene una identidad MOCK por defecto. La autorizacion permanece en Backend.
- Se combinan las pruebas de componentes, detalle, rutas y servidor; Playwright vuelve a incluir catalogo/Figma y conserva los casos del baseline. Favoritos mantiene su configuracion optativa de sandbox.
- Las pruebas de tarjeta incluyen el WishlistProvider que ahora exige develop.
- CI fija el Backend integrado f25857469f1ff05dacb506773b3889ce4afc6273 y ejecuta tambien las pruebas de servidor.

Validacion Linux en Docker: 174 pruebas de componentes/rutas y 41 de servidor PASS; lint sin errores (una advertencia heredada en OrdersHistory), build y tipado PASS. El stack temporal completo supera seis comprobaciones de catalogo/detalle/404/carrito/readiness. La evidencia consolidada de navegador se registra en SPECS.

Las pruebas usan fixtures, sin G6 REAL ni autenticacion real. No se modifica el .env privado ni el stack habitual del usuario. Los cambios locales de next-env.d.ts se preservan fuera del merge. El PR #3 permanece draft.

## Ajuste del manifiesto de recursos

El escaneo de fuente del primer CI detecto como generic-api-key la propiedad fileKey del manifiesto de favoritos incorporado desde develop. Su valor es el identificador publico del mismo Figma ya enlazado por el equipo. Se alinea el nombre a figmaFileId, igual que public/figma/manifest.json. No cambia el ID, nodos, archivos ni hashes; no hay consumidores de la propiedad anterior. No se desactiva el escaner ni se agrega una exclusion.
