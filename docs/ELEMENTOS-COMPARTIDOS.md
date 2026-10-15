# Guía de uso de elementos compartidos — Frontend

Versión documental 0.1.0 · 14/10/2026 · En revisión · Custodio: Giuliano. Esta guía refleja los exports y props del checkout actual. DS-001 v0.2.0 y el inventario de SPECS conservan la autoridad de diseño. Los componentes son un corte local parcial, con revisión independiente pendiente.

## 1. Ubicación y reglas de consumo

| Archivo | Exports disponibles |
|---|---|
| [`Header.tsx`](../src/shared/ui/Header.tsx) | `Header` |
| [`Footer.tsx`](../src/shared/ui/Footer.tsx) | `Footer` |
| [`Feedback.tsx`](../src/shared/ui/Feedback.tsx) | `ErrorState`, `MockNotice`, `ProductSkeletons` |
| [`SearchBox.tsx`](../src/features/catalog/SearchBox.tsx) | `SearchBox` |
| [`ProductCard.tsx`](../src/features/catalog/ProductCard.tsx) | `ProductCard` |
| [`CategoryChip.tsx`](../src/features/catalog/CategoryChip.tsx) | `CategoryChip` |
| [`useCatalog.ts`](../src/features/catalog/useCatalog.ts) | `useCatalog<T>` |
| [`api.ts`](../src/features/catalog/api.ts) | `readCatalog<T>`, `isHome`, `isCatalogPage`, `CatalogRequestError` |
| [`types.ts`](../src/features/catalog/types.ts) | `Category`, `ProductCardDTO`, `HomeDTO`, `PageMeta`, `CatalogPageDTO`, `CatalogSource`, `QueryState<T>` |

Importar desde la implementación existente; no copiar archivos por cada vista. Una futura extracción de `features/catalog` a `shared` requiere revisar consumidores/imports, no duplicar exports. Home/Catalog son contenedores de página, no elementos de la biblioteca.

Por instrucción de Giuliano, esta sesión permite crear commits y subir la rama de trabajo al repositorio remoto. No se publica en main ni se abren PR; Giuliano los preparará manualmente al terminar. La revisión utiliza la rama y sus diffs.

## 2. Shell

`Header` y `Footer` se montan una vez desde [`layout.tsx`](../src/app/layout.tsx). No reciben props; sus enlaces y contenido son fijos para el corte de catálogo. El Header incluye logo, salto al contenido, acceso a catálogo y SearchBox bajo Suspense. El main receptor tiene `id="contenido"`.

No insertar el layout completo dentro de otra página. La futura cabecera de checkout necesita su variante propia; no añadir cuenta/carrito o enlaces legales ficticios al componente actual. La aceptación G-SHELL y los frames siguen pendientes.

## 3. Buscador

```tsx
import { Suspense } from 'react';
import { SearchBox } from '@/features/catalog/SearchBox';

<Suspense fallback={<span>Cargando búsqueda…</span>}>
  <SearchBox />
</Suspense>
```

`SearchBox` es Client Component acoplado a la URL y al router de catálogo. Props: ninguna. Texto en edición y error son locales; al enviar normaliza espacios y valida 2–120 caracteres, conserva criterios compatibles y elimina page. Vacío elimina q; texto inválido no navega ni consulta. Enter envía una vez.

Utilizar **una sola instancia por documento**: los IDs `buscar-productos` y `search-error` aún son fijos. No es un TextInput genérico ni implementa los callbacks propuestos en la spec React como una API pública. Una segunda instancia requiere parametrizar IDs y revisar el contrato.

## 4. Tarjeta de producto

```tsx
import { ProductCard } from '@/features/catalog/ProductCard';
import type { ProductCardDTO } from '@/features/catalog/types';

export function Selection({ products }: { products: ProductCardDTO[] }) {
  return (
    <div className="product-grid">
      {products.map(product => (
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

| Prop | Tipo | Regla |
|---|---|---|
| `product` | `ProductCardDTO` | Datos públicos ya validados; no entidades administrativas completas |
| `returnPath` | `string` | Ruta relativa de contexto generada por el contenedor; sin tokens ni datos privados |

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
'use client';

import { ErrorState, MockNotice, ProductSkeletons } from '@/shared/ui/Feedback';
import { isCatalogPage } from '@/features/catalog/api';
import { useCatalog } from '@/features/catalog/useCatalog';

export function CatalogRegion() {
  const { state, retry } = useCatalog('products?q=running', isCatalogPage);
  if (state.status === 'loading') return <ProductSkeletons />;
  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={retry} />;
  }
  return (
    <section>
      {state.source === 'MOCK' && <MockNotice />}
      <p>{state.data.page.totalElements} productos</p>
    </section>
  );
}
```

| Elemento | Props | Estado / restricción |
|---|---|---|
| `ErrorState` | `message: string`, `onRetry: () => void` | Error persistente, `role=alert`; callback desde árbol cliente. Título y enlace de recuperación están fijados a catálogo |
| `MockNotice` | Ninguna | Render sólo para fuente MOCK; es una nota, no un estado de negocio |
| `ProductSkeletons` | Ninguna | Ocho tarjetas decorativas, un único estado de carga anunciado |
| `CategoryChip` | `categoryId: string`, `onRemove: () => void` | Resuelve nombre usando home; fallback “seleccionada”; el callback controla URL/reinicio de página |

`ErrorState` no es la implementación de O-010: faltan severidades, placements, cola, deduplicación, dismiss y política de tiempo. Su uso fuera de catálogo exige desacoplar título/acciones y documentar una nueva API. El EmptyState y la carga de categorías todavía están compuestos dentro de sus páginas.

## 6. Transporte y estado

`useCatalog(path, validate)` devuelve `{state, retry}`. `validate` es un type guard estable, definido fuera del render, como `isHome` o `isCatalogPage`. El hook cancela/ignora respuestas anteriores y conserva un error público seguro. No mantiene un store global ni implementa caché compartida de otros módulos.

`QueryState<T>` implementado es:

```ts
type QueryState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T; source: CatalogSource }
  | { status: 'error'; message: string; code: string };
```

Vacío corresponde a ready con datos vacíos válidos. No inventar éxito ante error. Las rutas permitidas del proxy son home/products; no usar el hook para login, operaciones de checkout ni endpoints internos. `MARKETPLACE_API_URL` sólo se lee en el servidor Next; el token de G6 queda en Backend.

## 7. Tokens y estilos

[`tokens.css`](../src/theme/tokens.css) contiene 18 variables derivadas de DS-001; [`globals.css`](../src/app/globals.css) conserva los estilos del corte. Inter 400/500/600/700 y Oswald 700 se cargan localmente desde el layout.

```css
.example-surface {
  color: var(--text-primary);
  background: var(--surface-cloud);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
```

`.button`, `.text-link`, `.empty-state`, `.product-grid` y `.container` son clases CSS, **no componentes React exportados**. No existe todavía `<Button variant="..." loading />`, Input, Modal o Toast compartido. Las medidas y grilla actuales requieren normalización/revisión frente a DS-001 y V-006-OPEN-04.

## 8. Pruebas, cambios y pendientes

La evidencia existente está en [`tests/catalog.spec.ts`](../tests/catalog.spec.ts): 13 casos de navegador para el corte, más build/typecheck/lint. Comprueban uso integrado; no certifican todas las variantes de una biblioteca ni sustituyen revisión manual de accesibilidad.

Para un cambio de elemento común: identificar consumidores, acordar ownership, documentar props/eventos/estados, verificar el comportamiento afectado y actualizar esta guía y el changelog de SPECS. Revisar con Sebastian; diseño con Fernando/Giuliano, contrato con Leonidas y aceptación con Jim según corresponda.

Pendientes de biblioteca: tokens completos, Button/campos tipados, EmptyState y skeletons parametrizables, shell configurable, O-010, modal/drawer O-001, tarjeta comercial/favorito e InternalPath. UI kit, Figma y publicación/aprobación permanecen abiertos. La guía normativa e historial se encuentran en `G1-Marketplace-SPECS/SPECS/ui/sistema-diseno/`.
