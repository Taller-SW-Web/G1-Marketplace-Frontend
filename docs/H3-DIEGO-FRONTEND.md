# Frontend H3 de Diego — guía de implementación

Este documento registra el corte conectado original F-036/F-038. La ampliación vigente de vistas, Deshacer, navegación y pendientes está en [FAVORITOS-VISTAS.md](FAVORITOS-VISTAS.md); las limitaciones históricas sobre ausencia de lista o Deshacer no describen la interfaz actual.

Alcance registrado antes del código: F-036/F-038, avance preparatorio H3. Base: `origin/develop`, `0f47537`; rama `feat/s1-f036-f038-frontend`. Conservar el prompt local y trabajo ajeno. Sin cambios al backend/SPECS, publicación ni cierre de tareas oficiales.

Trazabilidad: TASK-F036-FE-001, TASK-F038-FE-001, TASK-F036-QA-001, TASK-F038-QA-001. Fuentes: paquete vigente `plan/repartición por integrantes/DIEGO-ESPINOZA-PICON.md`, matriz 0.2.0, guía colaborativa, funcional/UI/API/React F-036 y F-038, DS-001, O-003, O-006 y G-AUTH/I-01/G-UNDO. Backend: contrato H3/OpenAPI 0.1.0, guía de uso y evidencia individual del 16/10/2026.

Puntos compartidos: ProductCard (botón hermano del Link), layout (proveedor cliente), estilos globales, configuración de pruebas y guía de componentes. No rediseñar shell ni alterar DTO de catálogo.

Decisiones locales: estado inicial desconocido por falta de GET; confirmación pesimista del servidor; sin Deshacer por G-UNDO. Sesión sandbox opaca en memoria, HttpOnly, 15 minutos máximo y pérdida al reiniciar. No es auth de Seguridad ni sirve para múltiples procesos. Auth/elegibilidad MOCK; HTTP y PostgreSQL REAL local. No localStorage, refresh, lista F-037 o endpoints backend nuevos.

Orden: sesión y handlers → cliente/contexto → controles/demo → pruebas unitarias/E2E → evidencia. Revisor principal Fernando Saire; contratos Leonidas y seguridad Andres según corresponda. Coordinación externa y revisión humana pendientes; no se enviaron mensajes automáticos.

Documentación Next: al iniciar no existía `node_modules/next/dist/docs`. Fallback oficial consultado: [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), [Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components). Ver evidencia para lectura local tras instalar y resultados reales.

## Ejecutar la demostración conectada

Requisitos: Node 22.18–24, npm, Docker Desktop Linux y dependencias instaladas en ambos repos (`npm ci`). Desde Frontend:

```powershell
npm run demo:h3
```

El comando reutiliza el compose temporal del backend, aplica migraciones, compila NestJS y genera tokens A/B de 15 minutos sin imprimirlos. Inicia Nest en 10200 y Next development en 3200. Abrir **http://127.0.0.1:3200/demo/h3/favoritos**. No utiliza la base de desarrollo ni añade rutas backend. La demo interactiva conserva los datos ficticios previos; el estado visual sigue desconocido hasta una mutación confirmada. Ctrl+C detiene únicamente sus procesos. PostgreSQL temporal permanece disponible; detenerlo desde Backend con `docker compose -f docker-compose.test.yml down` cuando no se necesite. Su contenido es efímero.

Seleccionar A, guardar PRD-1, comprobar ambos controles, repetir POST desde las acciones de prueba, seleccionar B y comprobar que DELETE de B no quita A; regresar a A y quitar. Recargar conserva la fila en DB pero reinicia el estado visual desconocido. Sin sesión, el botón abre aviso sin enviar POST. Probar los tres escenarios negativos. Los errores/timeout nunca confirman una escritura. Si vencen los JWT, reiniciar el comando; el selector no genera refresh.

Para verificar las filas, en Backend:

```powershell
docker compose -f docker-compose.test.yml exec -T postgres-test psql -U h3_test -d marketplace_h3_test -c "SELECT customer_id, product_id, created_at FROM wishlist_items WHERE customer_id IN ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222') ORDER BY customer_id;"
```

## Configuración manual alternativa

### Vistas de favoritos

- `/favoritos`: entrada desde Header. Sin sesión muestra un corazón, aviso de inicio de sesión y botón deshabilitado hasta disponer de la vista de acceso. Con sesión sandbox muestra un aviso de disponibilidad futura de la lista; no inventa una consulta GET.
- `/demo/h3/favoritos/lista`: vista previa con productos, precios y existencias ficticios. Tarjetas horizontales en escritorio y compactas en móvil, con imagen completa, marca, variante, disponibilidad, precio y acciones; secciones separadas para disponibles y agotados.
- `/demo/h3/favoritos/lista/vacia`: vista previa de usuario con sesión y lista vacía, con enlace para explorar catálogo.

Las dos vistas previas requieren el sandbox local habilitado, igual que la demo original. No autentican usuarios ni cargan listas persistidas. Detalle y carrito están pendientes de integración: los enlaces siguen el patrón del catálogo, pero la pantalla de detalle no existe en esta rama; agregar al carrito queda deshabilitado sin adaptador. Estas vistas amplían la interfaz preparatoria, no el contrato del backend.

Referencia visual verificada mediante el MCP oficial de Figma: página [Carrito y favoritos](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=1-4), frames `206:3140` (escritorio), `206:3224` (móvil), `206:3362` (vacío) y `206:3393` (producto no disponible). Recursos originales descargados a `public/figma/favorite-*`; procedencia, dimensiones y hashes en `favorites-manifest.json`. Las imágenes de producto siguen siendo props dinámicas; estas fotografías solo se usan en la demostración. La sección aparte de agotados conserva la petición del usuario. Cabecera/pie compartidos y tipografías Inter/Oswald del proyecto se conservan: la referencia usa otra cabecera y Roboto Condensed, por lo que se declara adaptación del contenido de favoritos, no identidad visual de toda la pantalla. Condiciones de envío/cambios del mockup solo se muestran como ejemplo en la demo. El botón de eliminación requiere `onRemove` y queda deshabilitado sin integración.

Seguir primero `../G1-Marketplace-Backend/docs/H3-DIEGO-USO.md` para PostgreSQL, migración, secreto y arranque de Nest. El proceso de Next requiere únicamente:

| Variable server-only | Valor |
|---|---|
| MARKETPLACE_API_URL | Origen del backend; default http://127.0.0.1:10000 |
| H3_FRONTEND_SANDBOX_ENABLED | true solo development/test |
| H3_FRONTEND_ORIGIN | Origen exacto del navegador; default http://127.0.0.1:3000 |
| H3_SANDBOX_TOKEN_A / B | JWT emitidos por el comando sandbox:token del backend |

No pasar H3_JWT_SECRET a Next. No usar NEXT_PUBLIC, storage, URLs o props para tokens. Abrir la URL exactamente como está configurada: localhost y 127.0.0.1 son orígenes diferentes. Se agregó el origen explícito porque NextURL normaliza loopback a localhost; no se relaja la igualdad de Origin ni se confía en Forwarded/Host. Una configuración inválida falla cerrada. Sesiones en memoria: expiran en 15 minutos máximo, se invalidan al cambiar identidad y desaparecen con reinicios del proceso; no aptas para despliegue distribuido. El proveedor refresca el estado de sesión al enfocar la ventana y cada minuto.

## Pruebas y límites

```powershell
npm run typecheck
npm run lint
npm run test:components
npm run test:server
npm run test:e2e:wishlist
npm run test:e2e:wishlist:connected
npm run build
npm run test:e2e:wishlist:production
```

La suite MOCK intercepta únicamente catálogo y mutaciones; no prueba persistencia. La conectada no intercepta HTTP y consulta PostgreSQL desde el harness, nunca desde la aplicación. Su preparación limpia solo PRD-1 de los UUID ficticios A/B en marketplace_h3_test. No correr ambas suites simultáneamente: usan 3200. Producción usa 3300 y el build por separado, verificando denegación incluso con flag true. Traces y videos desactivados para evitar grabar credenciales/cookies. Edge instalado es requerido por las configuraciones existentes.

El antiguo `npm run test:e2e` conserva su infraestructura de catálogo: depende de src/server.js, ausente en el backend actual. No se reemplazó silenciosamente por mocks ni se agregaron endpoints backend. Las pruebas de favoritos están excluidas de esa configuración. `npm test` sigue incluyendo la regresión histórica, por lo que no es un gate global aprobado mientras esa dependencia falte.

Restricción de transporte documentada: DELETE rechaza los IDs literales `.` y `..` porque URL normaliza esos segmentos y podría dirigir a otra ruta. No se transforman a otro producto. Los demás identificadores mantienen capitalización, espacios internos y Unicode; los segmentos se codifican. La demo contractual usa los cuatro fixtures PRD indicados. Homologar esos casos excepcionales antes de ampliar el contrato del transporte; no modifica el backend.

No se implementan O-006 completo, lista F-037, auth real o aprobación visual Figma. El aviso O-003 es una adaptación local sin enlaces a login inexistente. Las capturas demuestran la UI, no aceptación visual humana.
