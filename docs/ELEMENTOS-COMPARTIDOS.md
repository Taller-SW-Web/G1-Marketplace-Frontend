# Guía de uso de elementos compartidos — Frontend

Versión documental 0.2.1 · 15/10/2026 · En revisión · Custodio: Giuliano. Esta guía refleja los exports y props del checkout actual. DS-001 v0.2.0 y el inventario de SPECS conservan la autoridad de diseño. Los componentes son un corte local parcial, con revisión independiente pendiente.

## 1. Ubicación y reglas de consumo

| Archivo                                                        | Exports disponibles                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`Header.tsx`](../src/shared/ui/Header.tsx)                    | `Header`                                                                                                |
| [`Button.tsx`](../src/shared/ui/Button.tsx)                    | `Button`, `ButtonProps`                                                                                 |
| [`TextField.tsx`](../src/shared/ui/TextField.tsx)              | `TextField`, `TextFieldProps`                                                                           |
| [`EmptyState.tsx`](../src/shared/ui/EmptyState.tsx)            | `EmptyState`, `EmptyStateProps`                                                                         |
| [`Skeleton.tsx`](../src/shared/ui/Skeleton.tsx)                | `Skeleton`, `SkeletonProps`, `LoadingState`                                                             |
| [`Footer.tsx`](../src/shared/ui/Footer.tsx)                    | `Footer`                                                                                                |
| [`Feedback.tsx`](../src/shared/ui/Feedback.tsx)                | `ErrorState`, `MockNotice`, `ProductSkeletons`                                                          |
| [`SearchBox.tsx`](../src/features/catalog/SearchBox.tsx)       | `SearchBox`                                                                                             |
| [`ProductCard.tsx`](../src/features/catalog/ProductCard.tsx)   | `ProductCard`                                                                                           |
| [`CategoryChip.tsx`](../src/features/catalog/CategoryChip.tsx) | `CategoryChip`                                                                                          |
| [`useCatalog.ts`](../src/features/catalog/useCatalog.ts)       | `useCatalog<T>`                                                                                         |
| [`api.ts`](../src/features/catalog/api.ts)                     | `readCatalog<T>`, `isHome`, `isCatalogPage`, `CatalogRequestError`                                      |
| [`types.ts`](../src/features/catalog/types.ts)                 | `Category`, `ProductCardDTO`, `HomeDTO`, `PageMeta`, `CatalogPageDTO`, `CatalogSource`, `QueryState<T>` |

Importar desde la implementación existente; no copiar archivos por cada vista. Una futura extracción de `features/catalog` a `shared` requiere revisar consumidores/imports, no duplicar exports. Home/Catalog son contenedores de página, no elementos de la biblioteca.

Por instrucción de Giuliano, esta sesión permite crear commits y subir la rama de trabajo al repositorio remoto. No se publica en main ni se abren PR; Giuliano los preparará manualmente al terminar. La revisión utiliza la rama y sus diffs.

## 2. Shell

`Header` y `Footer` se montan una vez desde [`layout.tsx`](../src/app/layout.tsx). No reciben props; sus enlaces y contenido son fijos para el corte de catálogo. El Header sigue los frames de Figma: logo, salto al contenido, navegación por categorías y SearchBox bajo Suspense. Cuenta/favoritos/carrito y enlaces informativos del pie quedan deshabilitados hasta su integración; no son enlaces a rutas ficticias. El main receptor tiene `id="contenido"`.

No insertar el layout completo dentro de otra página. La futura cabecera de checkout necesita su variante propia; no añadir cuenta/carrito o enlaces legales ficticios al componente actual. La aceptación G-SHELL y los frames siguen pendientes.

## 3. Buscador

```tsx
import { Suspense } from "react";
import { SearchBox } from "@/features/catalog/SearchBox";

<Suspense fallback={<span>Cargando búsqueda…</span>}>
  <SearchBox />
</Suspense>;
```

`SearchBox` es Client Component acoplado a la URL y al router de catálogo. Props: ninguna. Etiqueta visible y botón con nombre accesible; texto en edición y error son locales; al enviar normaliza espacios y valida 2–120 caracteres, conserva criterios compatibles y elimina page. Vacío elimina q; texto inválido no navega ni consulta. Enter envía una vez.

El buscador compone ahora TextField y Button. TextField genera IDs estables y únicos con useId, por lo que ya no depende de buscar-productos/search-error fijos. Sigue acoplado al catálogo; para otros formularios consumir TextField directamente. La navegación usa una transición y el botón bloquea envíos repetidos mientras abre resultados.

## 4. Tarjeta de producto

```tsx
import { ProductCard } from "@/features/catalog/ProductCard";
import type { ProductCardDTO } from "@/features/catalog/types";

export function Selection({ products }: { products: ProductCardDTO[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          returnPath="/catalogo?q=running"
        />
      ))}
    </div>
  );
}
```

| Prop         | Tipo             | Regla                                                                              |
| ------------ | ---------------- | ---------------------------------------------------------------------------------- |
| `product`    | `ProductCardDTO` | Datos públicos ya validados; no entidades administrativas completas                |
| `returnPath` | `string`         | Ruta relativa de contexto generada por el contenedor; sin tokens ni datos privados |

DTO actual:

```ts
type ProductCardDTO = {
  productId: string;
  slug: string;
  name: string;
  categoryId: string;
  brandId: string;
  image: { url: string; alt: string };
};
```

La tarjeta muestra imagen, nombre y enlace. Los IDs opacos no se muestran como nombre de marca/categoría. No calcula importes ni presenta precio/stock/favoritos no suministrados. No anidar un botón de favorito dentro del enlace cuando se integre el bloque de Diego.

El destino `/productos/{slug}?returnTo=...` es el handoff a Sebastian; la ficha todavía no está implementada. El receptor debe validar `returnTo` como ruta interna permitida antes de usarlo: `encodeURIComponent` codifica, no autoriza destinos ni reemplaza el validador InternalPath pendiente.

## 5. Feedback, carga y demostración

```tsx
"use client";

import { ErrorState, MockNotice, ProductSkeletons } from "@/shared/ui/Feedback";
import { isCatalogPage } from "@/features/catalog/api";
import { useCatalog } from "@/features/catalog/useCatalog";

export function CatalogRegion() {
  const { state, retry } = useCatalog("products?q=running", isCatalogPage);
  if (state.status === "loading") return <ProductSkeletons />;
  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={retry} />;
  }
  return (
    <section>
      {state.source === "MOCK" && <MockNotice />}
      <p>{state.data.page.totalElements} productos</p>
    </section>
  );
}
```

| Elemento           | Props                                        | Estado / restricción                                                                                                    |
| ------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ErrorState`       | `message: string`, `onRetry: () => void`, `home?: boolean`     | Error persistente, `role=alert`; callback desde árbol cliente. Título y enlace de recuperación están fijados a catálogo |
| `MockNotice`       | Ninguna                                      | Render sólo para fuente MOCK; es una nota, no un estado de negocio                                                      |
| `ProductSkeletons` | Ninguna                                      | Seis tarjetas decorativas, un único estado de carga anunciado                                                           |
| `CategoryChip`     | `categoryId: string`, `onRemove: () => void` | Resuelve nombre usando home; fallback “seleccionada”; el callback controla URL/reinicio de página                       |

`ErrorState` no es la implementación de O-010: faltan severidades, placements, cola, deduplicación, dismiss y política de tiempo. Su uso fuera de catálogo exige desacoplar título/acciones y documentar una nueva API. Los vacíos de home/listado consumen EmptyState; categorías y productos reutilizan LoadingState/Skeleton. Los contenedores conservan textos, condiciones y acciones de negocio.

## 6. Transporte y estado

`useCatalog(path, validate)` devuelve `{state, retry}`. `validate` es un type guard estable, definido fuera del render, como `isHome` o `isCatalogPage`. El hook cancela/ignora respuestas anteriores y conserva un error público seguro. No mantiene un store global ni implementa caché compartida de otros módulos.

`QueryState<T>` implementado es:

```ts
type QueryState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T; source: CatalogSource }
  | { status: "error"; message: string; code: string };
```

Vacío corresponde a ready con datos vacíos válidos. No inventar éxito ante error. Las rutas permitidas del proxy son home/products; no usar el hook para login, operaciones de checkout ni endpoints internos. `MARKETPLACE_API_URL` sólo se lee en el servidor Next; el token de G6 queda en Backend.

## 7. Tokens y estilos

[`tokens.css`](../src/theme/tokens.css) contiene 24 variables derivadas de DS-001, incluyendo action-soft y los cinco espaciados; [`globals.css`](../src/app/globals.css) conserva los estilos del corte. Inter 400/500/600/700 y Oswald 700 se cargan localmente desde el layout.

```css
.example-surface {
  color: var(--text-primary);
  background: var(--surface-cloud);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
```

Button, TextField, EmptyState y Skeleton ya tienen componentes React tipados. Sus estilos siguen en globals.css; `.text-link`, `.product-grid` y `.container` conservan alcance de estilos/layout y los CTA de navegación siguen usando Link. O-010 completo no está implementado en este corte. La grilla y el resto de medidas locales requieren revisión frente a DS-001 y V-006-OPEN-04.

## 8. Pruebas, cambios y pendientes

Verificación ejecutada: 10 casos de componentes en [`shared-ui.test.tsx`](../tests/components/shared-ui.test.tsx), 13 de navegador en [`catalog.spec.ts`](../tests/catalog.spec.ts), TypeScript, lint y build de producción. Las pruebas comprueban eventos, bloqueo de loading, submit explícito, refs, IDs/labels/errores, acciones de vacío y anuncios de carga. No sustituyen revisión manual de accesibilidad ni aprobación de biblioteca.

Para un cambio de elemento común: identificar consumidores, acordar ownership, documentar props/eventos/estados, verificar el comportamiento afectado y actualizar esta guía y el changelog de SPECS. Revisar con Sebastian; diseño con Fernando/Giuliano, contrato con Leonidas y aceptación con Jim según corresponda.

Limitaciones del corte de semana 8: tokens parciales, campos y cargas limitados a inicio/búsqueda, shell fijo, feedback de catálogo y tarjeta comercial mínima. El retorno seguro debe validarse antes de integrar su receptor. UI kit y publicación/aprobación permanecen abiertos. Los frames Figma de Inicio/Catálogo ya están verificados y adaptados al alcance H3; la aceptación visual humana sigue pendiente. La guía normativa e historial se encuentran en `G1-Marketplace-SPECS/SPECS/ui/sistema-diseno/`.

## 9. Contratos de los componentes base (0.2.0)

### Button

```tsx
import { Button } from '@/shared/ui/Button';

<Button type="submit" loading={saving} loadingLabel="Guardando…">Guardar</Button>
<Button variant="secondary" onClick={onCancel}>Cancelar</Button>
```

Admite props nativas de button y ref de React 19. `type` predeterminado: button, para evitar envíos accidentales; declarar submit cuando corresponda. `variant`: primary/secondary/tertiary; `size`: sm/md/lg (44/48/56 px de altura mínima); defaults primary/md. `fullWidth`, `startIcon` y `endIcon` son opcionales. Los iconos son decorativos; el texto o aria-label debe nombrar la acción.

`loading` aplica disabled nativo y aria-busy; conserva el texto de la acción y añade loadingLabel accesible. No ejecuta onClick mientras esté bloqueado. No reinicia un disabled explícito al terminar. El contenedor controla loading: no se deduce éxito de una animación. Los enlaces de navegación siguen usando Link, sin simular disabled con un atributo inválido.

### TextField

```tsx
import { TextField } from "@/shared/ui/TextField";

<TextField
  label="Nombre"
  name="name"
  value={name}
  onChange={onChange}
  hint="Como quieres que aparezca"
  error={fieldError}
/>;
```

Props nativas de input y ref más `label` obligatorio, `hint`, `error`, `labelHidden`, `startAdornment`, `endAdornment`, `wrapperClassName` y `controlClassName`. Label visible por defecto; labelHidden sólo para composiciones con contexto accesible explícito; el buscador global mantiene la etiqueta visible del mockup. Placeholder no reemplaza label. ClassName nativo se aplica al input.

Genera id estable si no se proporciona; asocia label, hint y error. Conserva aria-describedby externo y añade referencias propias; error activa aria-invalid/aria-errormessage y un mensaje anunciado. StartAdornment es decorativo; endAdornment puede recibir una acción con nombre propio. El contenedor debe coordinar disabled/loading de campo y acciones. No valida contraseñas, precios ni reglas de negocio por su cuenta.

### EmptyState

```tsx
import { EmptyState } from "@/shared/ui/EmptyState";

<EmptyState
  title="Sin coincidencias"
  description="Prueba otra búsqueda."
  actions={<Button onClick={onClear}>Limpiar búsqueda</Button>}
/>;
```

Requiere title; admite description, actions, icon decorativo, className y headingLevel 2 o 3 (default 2). Genera una sección con encabezado asociado por ID, sin insertar otro h1. El contenedor decide cuándo existe un vacío válido y qué recuperación está permitida. No usarlo para esconder un error técnico ni inventar una acción de recuperación.

### Skeleton y LoadingState

```tsx
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";

<LoadingState label="Cargando categorías" className="category-grid">
  <Skeleton className="category-skeleton" />
  <Skeleton className="category-skeleton" />
</LoadingState>;
```

Skeleton acepta variant block/line/circle, className y style de layout; cada forma es aria-hidden. LoadingState recibe label, children decorativos y className para la composición interior; anuncia un solo estado. No introducir controles interactivos entre esos children ocultos. La animación respeta prefers-reduced-motion. ProductSkeletons conserva su export previo como composición de seis tarjetas sobre estos elementos.

### Ejecutar las pruebas

```powershell
npm run test:components
npm run test:e2e
npm test
```

Vitest usa Happy DOM y sólo recoge tests/components. Playwright recoge archivos .spec.ts y mantiene el recorrido real web→Next→BFF con fuente MOCK. npm test ejecuta ambas suites; test:e2e incluye el build. No es una integración real con G6.

## 10. Adaptación Figma H3 (0.2.1)

Referencias, recursos y diferencias de alcance: [FIGMA-H3.md](FIGMA-H3.md). La grilla del listado utiliza tres columnas por encima de 1100 px, dos entre 768 y 1100 y una en móvil. Inicio mantiene cuatro posiciones de categorías en escritorio y dos por fila en móvil, mostrando sólo las categorías recibidas.

| Componente | Contrato | Uso |
|---|---|---|
| `CategoryNavigation`, `src/features/catalog/CategoryNavigation.tsx` | `sidebar?: boolean`, `activeId?: string \| null` | Navegación H3 por enlaces a una categoría existente; consulta home. No es el panel de filtros múltiples. |
| `CategoryArtwork`, `src/features/catalog/CategoryArtwork.tsx` | `category: Category` | Ilustración de Figma según significado del nombre; exports desktop/mobile con proporciones originales. Categoría desconocida: sin ilustración. |
| `ErrorState`, `src/shared/ui/Feedback.tsx` | Se añade `home?: boolean`, por defecto false | Variante de error de inicio con fondo semántico e icono; mantiene compatibles los consumidores existentes. |

Los componentes base conservan sus props. ProductCard mantiene el DTO mínimo y las imágenes dinámicas: no obtiene precio/stock ni simula favoritos. `public/figma/manifest.json` registra la procedencia y hashes de los recursos locales, sin URLs temporales de ejecución. Se mantienen los 10 tests de componentes y se amplía la verificación de navegador con geometría, recursos visibles y estados de H3.

## 11. Handoff de favoritos H3 — Diego

ProductCard conserva su DTO/props y añade FavoriteControl como hermano del Link. El layout monta WishlistProvider; consumidores aislados de ProductCard deben montar también ese proveedor. Con sandbox deshabilitado no muestra el control ni consulta sesión. No modifica enlaces, IDs o contenido del catálogo. Header enlaza Favoritos con `/favoritos`; Footer conserva su comportamiento.

FavoriteToggle es presentacional: productId, confirmed (`unknown`/`saved`/`absent`), busy, authenticated; eventos onSave(id), onRemove(id), onRequireAuth(). `aria-pressed` se omite en desconocido. FavoriteControl conecta transporte/contexto y aviso local de sesión requerida; no navega a login ficticio. El control secundario de la demo usa announce=false para compartir estado sin duplicar anuncios. Button y tokens mantienen su API.

No hay GET: ningún corazón infiere ausencia inicial ni persiste favoritos en storage. 201/200 confirma guardar; 204 confirma quitar. El estado se comparte por producto/ámbito opaco de sesión, se limpia al cambiar identidad y se ignoran respuestas anteriores. Mutaciones serializadas por producto, sin retry automático. La demo independiente no implementa V-009/F-037 ni O-006 completo. Guía y decisiones: [H3-DIEGO-FRONTEND.md](H3-DIEGO-FRONTEND.md). Revisión humana y coordinación de componentes compartidos pendientes.

FavoritesList recibe productos con disponibilidad explícita, separa disponibles y sin existencias y ofrece un estado vacío con enlace al catálogo. Descripción, categoría legible, color y precio son opcionales; el DTO compartido de catálogo no cambia. La eliminación de un favorito se expone mediante `onRemove` opcional; sin él el control queda deshabilitado. Las tarjetas reutilizan el patrón de URL de detalle; la pantalla de detalle todavía no existe en esta rama. Los estilos de imágenes que llenan su área están limitados a `.favorites-card`.

### Ampliación de vistas de favoritos

La interfaz V-009 y O-006 ya tiene controlador compartido para HTTP y demostración de escenarios; el párrafo de alcance preparatorio anterior describe el corte H3 original. Backend todavía no implementa el GET F-037: el proxy nuevo está protegido por un flag server-only desactivado. El movimiento al carrito (F-039) queda fuera de este corte. No se afirma integración real por disponer de una vista.

SiteChrome aplica marco específico únicamente a `/favoritos` y `/demo/h3/favoritos/lista…`, manteniendo el shell del catálogo. SearchBox admite `compact?: boolean` (default false), reutiliza validación y evita trasladar parámetros de demo a catálogo. FavoritesList conserva callbacks opcionales; `pending` describe la operación por producto. Las tarjetas enlazan a `/productos/{slug}` con `returnTo`; la ficha la entrega otro integrante. Productos retirados se distinguen de agotados y no enlazan a ficha; imágenes y precios pueden faltar. Recursos y fuentes originales son locales. Guía completa: [FAVORITOS-VISTAS.md](FAVORITOS-VISTAS.md).
