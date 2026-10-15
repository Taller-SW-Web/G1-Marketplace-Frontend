# Checklist de Implementación — Sebastian Matias Malca Agüero
## Hito 3 · Semana 8 · Corte parcial F-011 (MOCK) — **FRONTEND**

> **Repositorio:** `G1-Marketplace-Frontend`
>
> **Alcance exclusivo de H3.** El corte de Sebastian para el Hito 3 es la pantalla V-007 con la región descriptiva de F-011 (nombre, marca, descripción, galería) consumiendo el BFF con fixture `MOCK`. F-012–F-015 son S2/S5 y **no forman parte de este hito**.
>
> **La ruta crítica de H3 es de Giuliano** (F-006/F-007 con datos REAL de Productos). El corte de Sebastian es un avance parcial paralelo rotulado `MOCK`.

---

## Datos rápidos

| Campo | Valor |
|---|---|
| **Stack** | React + TypeScript + Next.js App Router |
| **Feature folder** | `src/features/catalog/` |
| **Ruta pública propia** | `/productos/[slug]` |
| **Endpoint BFF consumido** | `GET /api/v1/catalog/products/{slug}` |
| **Rama de trabajo** | `feat/h3-f011-ficha-parcial` desde `develop` |
| **Revisor de su PR** | Giuliano Macchiavello |
| **Rol como revisor H3** | Revisor de Giuliano en tareas `TASK-F007-*` |
| **Etiqueta obligatoria** | `MOCK` en todo: fixtures, datos visibles, evidencia |

---

## Límites estrictos de H3

1. **Solo F-011** — galería + nombre + marca + descripción + specs técnicas. Sin precio, sin variantes, sin stock, sin carrito, sin favoritos, sin relacionados.
2. **Fixture MOCK** — I-01 sigue bloqueado. No marcar `TASK-F011-INT-001` como terminado.
3. **El frontend nunca llama directamente a Productos y Ofertas** — todo pasa por el BFF de Marketplace (`/api/v1/catalog/products/{slug}`).
4. **Sin datos ficticios visibles** — precios, stock y variantes no aparecen aunque el diseño Figma los muestre; la región se omite en este corte.
5. **No autoaprobarse el PR** — siempre asignar a Giuliano como revisor.

---

## PASO 1 — Rama y estructura de archivos

```bash
# Desde develop
git checkout develop && git pull origin develop
git checkout -b feat/h3-f011-ficha-parcial
```

Archivos a crear para H3 (solo estos):

```
src/
└── features/
    └── catalog/
        ├── types/
        │   └── product-detail.types.ts   ← DTOs F-011
        ├── services/
        │   ├── product-detail.service.ts ← cliente HTTP + validación slug
        │   └── product-detail.adapter.ts ← selector MOCK/REAL
        ├── fixtures/
        │   └── product-detail.fixture.ts ← ⚠️ MOCK
        ├── hooks/
        │   └── useProductDetail.ts       ← hook con AbortController
        └── components/
            ├── ProductDetailContainer.tsx
            ├── ProductGallery.tsx
            ├── GalleryViewer.tsx
            └── TechnicalSpecifications.tsx

src/app/
└── productos/
    └── [slug]/
        └── page.tsx                      ← ruta Next.js App Router

tests/catalog/
    ├── ProductGallery.test.tsx
    ├── GalleryViewer.test.tsx
    ├── TechnicalSpecifications.test.tsx
    └── useProductDetail.test.ts
```

- [x] Rama creada y subida como **`feat/h3-f011-f015-detalle-de-producto`** — **desviaciones acordadas:** (1) nombre con hito + rango del bloque F-011–F-015 + módulo ("detalle de producto"; con guiones porque git no admite espacios), en lugar de `feat/h3-f011-ficha-parcial`; (2) creada desde `main` porque no existe `develop` en el repo; (3) PR (PASO 13) pendiente de consultar.
- [x] `.env.local` con `NEXT_PUBLIC_BFF_MODE=mock` (en `.gitignore`, nunca subir) — verificado con `git check-ignore -v .env.local` → `.gitignore:4:.env*`
- [x] Estructura de carpetas creada

---

## PASO 2 — Tipos TypeScript (F-011)

**`src/features/catalog/types/product-detail.types.ts`**

```typescript
export interface ProductBrandDTO {
  brandId: string;
  name: string;
}

export interface ProductMediaDTO {
  mediaId: string;
  type: 'IMAGE';
  url: string;
  alt: string;        // obligatorio; BFF genera fallback si falta
  displayOrder: number;
}

export interface TechnicalSpecificationDTO {
  group?: string;
  name: string;
  value: string;
  unit?: string | null;
  displayOrder: number;
}

export interface ProductDetailDTO {
  productId: string;
  slug: string;
  name: string;
  brand: ProductBrandDTO;
  description?: string;
  technicalSpecifications: TechnicalSpecificationDTO[];
  media: ProductMediaDTO[];   // nunca vacío para producto activo
}

export interface ProductDetailResponseDTO {
  data: ProductDetailDTO;
  meta: { source: string; retrievedAt: string };
}

// Estados de la máquina F-011
export type ProductDetailStatus =
  | { kind: 'loading' }
  | { kind: 'ready';         data: ProductDetailDTO }
  | { kind: 'not_available' }          // 404 / slug inválido
  | { kind: 'error';         code: ProductDetailErrorCode };

export type ProductDetailErrorCode =
  | 'INVALID_PRODUCT_SLUG'
  | 'PRODUCT_NOT_AVAILABLE'
  | 'PRODUCT_CATALOG_INVALID_RESPONSE'
  | 'PRODUCT_CATALOG_UNAVAILABLE'
  | 'PRODUCT_CATALOG_TIMEOUT';
```

- [x] Tipos definidos y revisados contra el [contrato API F-011](../../SPECS/contrato-api/F-011-detalle-producto.md) — `product-detail.types.ts` idéntico al contrato API-F011-001

---

## PASO 3 — Fixture MOCK

**`src/features/catalog/fixtures/product-detail.fixture.ts`**

```typescript
/** ⚠️ MOCK — Solo desarrollo local. No usar en producción. */
import type { ProductDetailResponseDTO } from '../types/product-detail.types';

export const MOCK_PRODUCT_SIMPLE: ProductDetailResponseDTO = {
  data: {
    productId: 'PRD-MOCK-001',
    slug: 'zapatillas-running-aero-x',
    name: 'Zapatillas Running Aero X [MOCK]',
    brand: { brandId: 'BR-MOCK', name: 'BrandMock' },
    description: 'Descripción de prueba. Producto ficticio.',
    technicalSpecifications: [
      { group: 'Características', name: 'Material', value: 'Malla técnica', displayOrder: 1 },
      { group: 'Características', name: 'Peso',     value: '280', unit: 'g', displayOrder: 2 },
    ],
    media: [
      { mediaId: 'MED-001', type: 'IMAGE', url: 'https://placehold.co/600x400', alt: 'Vista frontal [MOCK]', displayOrder: 1 },
      { mediaId: 'MED-002', type: 'IMAGE', url: 'https://placehold.co/600x400', alt: 'Vista lateral [MOCK]', displayOrder: 2 },
    ],
  },
  meta: { source: 'MOCK', retrievedAt: new Date().toISOString() },
};

export const MOCK_PRODUCT_NO_SPECS: ProductDetailResponseDTO = {
  ...MOCK_PRODUCT_SIMPLE,
  data: { ...MOCK_PRODUCT_SIMPLE.data, technicalSpecifications: [] },
};

// Slugs especiales para pruebas:
// 'producto-no-existente-mock'  → simula 404
// 'producto-error-503-mock'     → simula error de servicio
// 'producto-sin-specs-mock'     → sin especificaciones técnicas
```

- [x] Fixture creado, datos visibles con sufijo `[MOCK]`
- [x] Slugs especiales documentados en el fixture — `producto-no-existente-mock` (404), `producto-error-503-mock`, `producto-error-504-mock`, `producto-sin-specs-mock`

---

## PASO 4 — Servicio HTTP y adaptador

**`src/features/catalog/services/product-detail.service.ts`**

```typescript
import type { ProductDetailResponseDTO, ProductDetailErrorCode } from '../types/product-detail.types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ProductDetailError extends Error {
  constructor(public code: ProductDetailErrorCode, public status: number) {
    super(code);
  }
}

export async function fetchProductDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetailResponseDTO> {

  // Validación local — no llama al BFF con slug inválido
  if (!slug || slug.length > 120 || !SLUG_PATTERN.test(slug)) {
    throw new ProductDetailError('INVALID_PRODUCT_SLUG', 400);
  }

  const res = await fetch(
    `/api/v1/catalog/products/${encodeURIComponent(slug)}`,
    { signal, headers: { Accept: 'application/json' } },
  );

  if (res.status === 404) throw new ProductDetailError('PRODUCT_NOT_AVAILABLE',            404);
  if (res.status === 400) throw new ProductDetailError('INVALID_PRODUCT_SLUG',             400);
  if (res.status === 502) throw new ProductDetailError('PRODUCT_CATALOG_INVALID_RESPONSE', 502);
  if (res.status === 503) throw new ProductDetailError('PRODUCT_CATALOG_UNAVAILABLE',      503);
  if (res.status === 504) throw new ProductDetailError('PRODUCT_CATALOG_TIMEOUT',          504);
  if (!res.ok)            throw new ProductDetailError('PRODUCT_CATALOG_UNAVAILABLE',      res.status);

  const json = await res.json() as ProductDetailResponseDTO;

  // Validación mínima: no mostrar ficha parcial
  if (!json.data?.productId || !json.data?.name || !json.data?.media?.length) {
    throw new ProductDetailError('PRODUCT_CATALOG_INVALID_RESPONSE', 502);
  }

  return json;
}
```

**`src/features/catalog/services/product-detail.adapter.ts`**

```typescript
import { fetchProductDetail, ProductDetailError } from './product-detail.service';
import { MOCK_PRODUCT_SIMPLE, MOCK_PRODUCT_NO_SPECS } from '../fixtures/product-detail.fixture';

/** Selector MOCK/REAL — activado por NEXT_PUBLIC_BFF_MODE=mock */
export async function getProductDetail(
  slug: string,
  signal?: AbortSignal,
) {
  if (process.env.NEXT_PUBLIC_BFF_MODE === 'mock') {
    await new Promise(r => setTimeout(r, 400));   // simular latencia
    if (slug === 'producto-no-existente-mock')
      throw new ProductDetailError('PRODUCT_NOT_AVAILABLE', 404);
    if (slug === 'producto-error-503-mock')
      throw new ProductDetailError('PRODUCT_CATALOG_UNAVAILABLE', 503);
    if (slug === 'producto-sin-specs-mock')
      return MOCK_PRODUCT_NO_SPECS;
    return MOCK_PRODUCT_SIMPLE;
  }

  return fetchProductDetail(slug, signal);
}
```

- [x] Servicio valida slug antes de llamar al BFF
- [x] Todos los códigos HTTP (`400/404/502/503/504`) mapeados a `ProductDetailErrorCode`
- [x] Adaptador activa MOCK cuando `NEXT_PUBLIC_BFF_MODE=mock`

---

## PASO 5 — Hook `useProductDetail`

**`src/features/catalog/hooks/useProductDetail.ts`**

```typescript
import { useEffect, useReducer, useRef } from 'react';
import { getProductDetail } from '../services/product-detail.adapter';
import { ProductDetailError } from '../services/product-detail.service';
import type { ProductDetailStatus } from '../types/product-detail.types';

export function useProductDetail(slug: string) {
  const [state, dispatch] = useReducer(
    (_: ProductDetailStatus, next: ProductDetailStatus) => next,
    { kind: 'loading' } as ProductDetailStatus,
  );
  const retryCount = useRef(0);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();
    dispatch({ kind: 'loading' });

    getProductDetail(slug, controller.signal)
      .then(res => dispatch({ kind: 'ready', data: res.data }))
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof ProductDetailError) {
          const notFound = err.code === 'PRODUCT_NOT_AVAILABLE'
                        || err.code === 'INVALID_PRODUCT_SLUG';
          dispatch(notFound
            ? { kind: 'not_available' }
            : { kind: 'error', code: err.code });
        } else {
          dispatch({ kind: 'error', code: 'PRODUCT_CATALOG_UNAVAILABLE' });
        }
      });

    // Cancelar petición en vuelo si el slug cambia o el componente desmonta
    return () => controller.abort();
  }, [slug, retryCount.current]);

  const retry = () => { retryCount.current += 1; };

  return { state, retry };
}
```

- [x] `AbortController` cancela petición si `slug` cambia antes de que responda
- [x] `retry()` solo relanza F-011 — no lanza precio, stock ni variantes
- [x] `NOT_AVAILABLE` para `404` e `INVALID_PRODUCT_SLUG`
- [x] `ERROR` para `503/504/502` con código visible para el componente

> **Desviación técnica:** el hook se implementó con `useState` + estado derivado (`result.key === key`) en lugar de `useReducer` + `retryCount.current`, porque el patrón de `useRef` en dependencias del efecto incumple `react-hooks/exhaustive-deps` y `setState` dentro del efecto incumple `react-hooks/set-state-in-effect`. Comportamiento observable idéntico.

---

## PASO 6 — Componente `ProductGallery`

**`src/features/catalog/components/ProductGallery.tsx`**

Requisitos de implementación:

```typescript
interface Props {
  media: ProductMediaDTO[];
  onOpenViewer: (index: number) => void;
}
```

- [x] Estado `selectedIndex` local (inicia en 0)
- [x] Imagen principal con `alt` del DTO; si falla `onError` → mostrar respaldo con texto "Imagen no disponible" (el `h1` y descripción deben seguir visibles)
- [x] Botón "Ampliar imagen" con `aria-label` → llama a `onOpenViewer(selectedIndex)`
- [x] Anterior / Siguiente: **deshabilitados** en primer y último elemento respectivamente — sin carrusel infinito
- [x] Miniaturas (`aria-pressed={idx === selectedIndex}`) — no depender solo de color para indicar selección
- [x] Miniaturas fallidas marcadas como no disponibles; no ocultadas
- [x] Mínimo 44 × 44 px en todos los botones (verificado en `globals.css`)

---

## PASO 7 — Componente `GalleryViewer` (Modal O-002)

**`src/features/catalog/components/GalleryViewer.tsx`**

```typescript
interface Props {
  opened: boolean;
  media: ProductMediaDTO[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}
```

- [x] `role="dialog"` + `aria-modal="true"` + `aria-label` con nombre del producto
- [x] Al abrir: guardar `document.activeElement` y enfocar el botón Cerrar
- [x] Al cerrar: restaurar foco al elemento que abrió el modal
- [x] Tecla `Escape` cierra el modal (listener en `useEffect`)
- [x] `aria-live="polite"` anuncia "Imagen X de Y"
- [x] Anterior / Siguiente deshabilitados en extremos
- [x] Si `opened === false` → devuelve `null` (no renderiza nada)

> **Desviación menor:** la prop `label` de `GalleryViewer` es opcional (se usa por defecto "Imagen X de Y") para reutilizar el visor desde el contenedor sin forzar el texto.

---

## PASO 8 — Componente `TechnicalSpecifications`

**`src/features/catalog/components/TechnicalSpecifications.tsx`**

```typescript
interface Props {
  specs: TechnicalSpecificationDTO[];
  description?: string;
}
```

- [x] Si `specs.length === 0` Y sin `description` → `return null` (sin bloque vacío ni título huérfano)
- [x] Descripción en `<p>` con texto sanitizado — **NO** `dangerouslySetInnerHTML` sin sanitización
- [x] Especificaciones en `<dl>/<dt>/<dd>` agrupadas por `spec.group`
- [x] Unidad concatenada al valor: `280 g`, no en columna separada

---

## PASO 9 — Contenedor `ProductDetailContainer`

**`src/features/catalog/components/ProductDetailContainer.tsx`**

```typescript
interface Props { slug: string }
```

| Estado | Qué renderizar |
|---|---|
| `loading` | Skeleton accesible (`aria-busy="true"`) — sin datos ficticios |
| `not_available` | `<h1>Producto no disponible</h1>` + enlace `/catalogo` — **sin distinguir** si no existe, inactivo o privado |
| `error` | Mensaje genérico + botón `Reintentar` (solo F-011) + enlace `/catalogo` |
| `ready` | Migas → Galería → (Marca + `<h1>nombre</h1>`) → TechnicalSpecifications → GalleryViewer |

- [x] **Región comercial vacía en H3** — precio, variantes, stock y carrito se omiten; sin controles ficticios ni importes de ejemplo
- [x] Un único `<h1>` con el nombre del producto
- [x] Migas: `Inicio / Catálogo / [nombre]` — los dos primeros son enlaces, el tercero no
- [x] `GalleryViewer` controlado con `viewerOpen` y `viewerIndex` como estado local del contenedor

> **Desviación:** las migas solo se renderizan en estado `ready`. En `loading`/`not_available`/`error` no hay nombre de producto que mostrar, y el criterio RC-F-011-03 exige que `not_available` no exponga causas internas (el test verifica ausencia de textos adicionales).

---

## PASO 10 — Ruta Next.js App Router

**`src/app/productos/[slug]/page.tsx`**

```typescript
import { ProductDetailContainer } from '@/features/catalog/components/ProductDetailContainer';

interface Props { params: { slug: string } }

export default function ProductPage({ params }: Props) {
  return <ProductDetailContainer slug={params.slug} />;
}

export function generateMetadata({ params }: Props) {
  return {
    title: `Producto — Marketplace`,
    description: 'Detalle del producto.',
  };
}
```

- [x] Ruta `/productos/[slug]` funciona y pasa el slug al contenedor
- [x] **Entrada desde tarjeta de V-006:** una `<a href="/productos/{slug}">` en la tarjeta `ProductCard` de V-006 abre correctamente esta ruta. Verificar navegación real desde el catálogo hacia la ficha (flujo definido en `SEBASTIAN-MALCA-AGUERO.md` §H3: *"abrir V-007 desde una tarjeta de V-006"*). En H3 MOCK basta con navegar manualmente a `/productos/zapatillas-running-aero-x` y capturar el resultado. — `ProductCard` ya enlaza con `Link href={/productos/${slug}...}`; se navegó manualmente y se capturó (el catálogo MOCK necesita el BFF en `127.0.0.1:10000`, no disponible en este entorno).
- [x] No hay ninguna llamada a APIs externas en el componente de página

---

## PASO 11 — Pruebas obligatorias de H3

Los cinco casos RC-F-011 son los únicos obligatorios para este hito.

### RC-F-011-01 — Controles deshabilitados en extremos
```typescript
it('deshabilita "Anterior" en la primera imagen', () => {
  render(<ProductGallery media={MOCK_MEDIA_2} onOpenViewer={jest.fn()} />);
  expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
});

it('deshabilita "Siguiente" en la última imagen', async () => {
  render(<ProductGallery media={MOCK_MEDIA_2} onOpenViewer={jest.fn()} />);
  await userEvent.click(screen.getAllByRole('button')[/* miniatura 2 */2]);
  expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
});
```

### RC-F-011-02 — Imagen fallida conserva título y descripción
```typescript
it('muestra respaldo cuando la imagen falla pero mantiene h1 y descripción visibles', () => {
  render(<ProductGallery media={MOCK_MEDIA_1} onOpenViewer={jest.fn()} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText(/imagen no disponible/i)).toBeInTheDocument();
  // El contenedor padre sigue mostrando h1 y descripción — verificar en integración
});
```

### RC-F-011-03 — Estado NOT_AVAILABLE neutral
```typescript
it('no expone causa interna en estado not_available', async () => {
  // adapter mock → PRODUCT_NOT_AVAILABLE
  render(<ProductDetailContainer slug="producto-no-existente-mock" />);
  await screen.findByText(/producto no disponible/i);
  expect(screen.queryByText(/inactivo/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/privado/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /catálogo/i })).toHaveAttribute('href', '/catalogo');
});
```

### RC-F-011-04 — Modal: Escape restaura foco
```typescript
it('devuelve el foco al botón que abrió el visor al presionar Escape', async () => {
  render(<GalleryViewer opened={true} media={MOCK_MEDIA_2} index={0}
    onClose={mockClose} onIndexChange={jest.fn()} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(mockClose).toHaveBeenCalledTimes(1);
  // Verificar restauración de foco en prueba de integración del contenedor
});
```

### RC-F-011-05 — Descripción maliciosa no ejecuta código
```typescript
it('sanitiza contenido malicioso en descripción', () => {
  render(
    <TechnicalSpecifications
      specs={[]}
      description={'<script>window.__xss=true</script>Texto válido'}
    />
  );
  expect(document.querySelector('script')).toBeNull();
  expect(window.__xss).toBeUndefined();
  expect(screen.getByText(/texto válido/i)).toBeInTheDocument();
});
```

- [x] RC-F-011-01 ✅
- [x] RC-F-011-02 ✅
- [x] RC-F-011-03 ✅
- [x] RC-F-011-04 ✅
- [x] RC-F-011-05 ✅

> Los tests usan **Vitest + React Testing Library** (no Jest): `onOpenViewer`/`onClose` se configuran con `vi.fn()` y no existe `@testing-library/jest-dom` en el repo (matchers propios). RC-F-011-04 se verifica además en navegador real (foco en "Cerrar visor" al abrir → `Escape` → foco restaurado en "Ampliar imagen").

---

## PASO 12 — Verificación pre-PR

```bash
npm run typecheck   # 0 errores
npm run lint        # 0 warnings bloqueantes
npm run test        # RC-F-011-01 a 05 en verde
npm run build       # compilación sin errores
```

Checklist rápido antes de abrir el PR:

- [x] Sin `any` en contratos ni props
- [x] Sin `dangerouslySetInnerHTML` sin sanitizar
- [x] Sin llamadas directas a Productos y Ofertas desde el navegador — todo vía BFF (`/api/catalog/...`, ver nota de desviación abajo)
- [x] Todos los datos del fixture tienen `[MOCK]` visible o `source: 'MOCK'`
- [x] `.env.local` no subido (verificar `.gitignore`)
- [x] Región de precio/variantes/stock **omitida** — sin placeholders ni controles falsos

Estado de los comandos en este entorno:

- `npm run typecheck` → ✅ 0 errores
- `npm run lint` → ✅ 0 errores / 0 warnings
- `npm run test:components` → ✅ 32/32 (incluye RC-F-011-01 a 05)
- `npm run build` → ✅ ruta `ƒ /productos/[slug]`
- `npm run test` (= components + `test:e2e`) → ⚠️ **e2e no ejecutable aquí:** requiere el BFF Marketplace en `127.0.0.1:10000` (`MARKETPLACE_API_URL`) que no está levantado; los specs existentes dependen de él. Navegadores Playwright (chromium) instalados para generar capturas.

> **Desviación de endpoint:** el servicio llama a `/api/catalog/products/{slug}` (proxy Next ya existente en `src/app/api/catalog/[...path]/route.ts`, extendido con validación de slug) en lugar de `/api/v1/catalog/...` literal, para no duplicar el proxy compartido. El proxy aguanta `MARKETPLACE_API_URL` apuntando al BFF `/api/v1/...`, por lo que la regla "el navegador nunca llama directo a Productos y Ofertas" se cumple.

---

## PASO 13 — PR y revisión de pares

### Tu propio PR (Frontend)
- [ ] PR desde `feat/h3-f011-ficha-parcial` → `develop` en `G1-Marketplace-Frontend`
- [ ] Descripción incluye: alcance (F-011 MOCK H3), capturas Desktop y Mobile de los 4 estados (`LOADING`, `READY`, `NOT_AVAILABLE`, `ERROR`), reporte `npm run test` y nota de gates bloqueados
- [ ] Revisor asignado: **Giuliano Macchiavello**
- [ ] No autoaprobarse

### Tu rol como revisor de Giuliano (F-007 — Frontend)
- [ ] Revisar `TASK-F007-FE-001` — verificar `SearchBox`, `SearchResultsHeading`, validación de query 2–120 chars, race condition con `AbortController`, estado `ZERO_RESULTS` con `q` visible
- [ ] Dejar comentarios constructivos; aprobar formalmente cuando cumpla los criterios

---

## PASO 14 — Evidencia H3

Crear **`EVIDENCIA-H3-SEBASTIAN-MALCA-TASK-F011-FE-001.md`** en el PR o en `docs/evidencias/h3/`:

```markdown
# Evidencia H3 — Sebastian Malca — TASK-F011-FE-001 (MOCK)

**Fecha:**
**Repositorio / rama / commit:** G1-Marketplace-Frontend / feat/h3-f011-ficha-parcial / ...
**Specs leídas:** F-011 v0.1.0 · V-007 v0.1.0 · O-002 v0.1.0
**Frame Figma:** (enlace confirmado por PO)

**Trabajo manual realizado:**

**IA utilizada:** (herramienta · propósito · resumen del prompt — sin secretos)
**Código generado por IA:** (archivos/funciones) — **qué revisé y corregí manualmente:**

**Pruebas ejecutadas:**
- Comando: `npm run test`
- RC-F-011-01: PASS
- RC-F-011-02: PASS
- RC-F-011-03: PASS
- RC-F-011-04: PASS
- RC-F-011-05: PASS
- Etiqueta: **MOCK**

**Capturas / log sanitizado:** (adjuntar)

**Gates que bloquean integración REAL:**
- I-01: ruta/auth/payload de Productos y Ofertas sin homologar
- Sin cierre de I-01 → TASK-F011-INT-001 permanece **Bloqueado**

**Revisor:** Giuliano Macchiavello — **PR:** [enlace]
```

- [x] Evidencia creada con etiqueta `MOCK` explícita → [`docs/evidencias/h3/EVIDENCIA-H3-SEBASTIAN-MALCA-TASK-F011-FE-001.md`](docs/evidencias/h3/EVIDENCIA-H3-SEBASTIAN-MALCA-TASK-F011-FE-001.md)
- [x] `TASK-F011-INT-001` marcado como **Bloqueado** en [seguimiento](../../plan/seguimiento/F-011-detalle-producto.md) (no Terminado) — ya constaba como `Bloqueado` (I-01 sin cerrar); no se modificó

---

## Resumen de estados de tareas al cerrar H3 (Frontend)

| TASK-ID | Estado al cerrar H3 |
|---|---|
| `TASK-F011-FE-001` | **En progreso / Terminado** (corte MOCK) |
| `TASK-F011-INT-001` | **Bloqueado** (I-01 sin cerrar) |
