import type {
  CatalogPageDTO,
  HomeDTO,
  CatalogSource,
  ProductCardDTO,
  CatalogFiltersDTO,
} from "./types";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function product(value: unknown): value is ProductCardDTO {
  return (
    record(value) &&
    text(value.productId) &&
    text(value.name) &&
    text(value.categoryId) &&
    text(value.brandId) &&
    typeof value.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) &&
    (value.image === null ||
      (record(value.image) &&
        text(value.image.alt) &&
        text(value.image.url) &&
        (value.image.url.startsWith("https://") ||
          /^\/fixtures\/product-[0-3]\.svg$/.test(value.image.url))))
  );
}
export function isHome(value: unknown): value is HomeDTO {
  return (
    record(value) &&
    Array.isArray(value.categories) &&
    value.categories.every(
      (item) => record(item) && text(item.categoryId) && text(item.name),
    ) &&
    Array.isArray(value.featuredProducts) &&
    value.featuredProducts.every(product)
  );
}
export function isCatalogPage(value: unknown): value is CatalogPageDTO {
  if (
    !record(value) ||
    !Array.isArray(value.data) ||
    !value.data.every(product) ||
    !record(value.page)
  )
    return false;
  const page = value.page;
  return (
    ["number", "size", "totalElements", "totalPages"].every(
      (key) => Number.isSafeInteger(page[key]) && Number(page[key]) >= 0,
    ) &&
    Number(page.size) >= 1 &&
    Number(page.size) <= 48 &&
    value.data.length <= Number(page.size) &&
    page.totalPages === Math.ceil(Number(page.totalElements) / Number(page.size)) &&
    value.data.length === Math.max(0, Math.min(Number(page.size), Number(page.totalElements) - Number(page.number) * Number(page.size))) &&
    new Set(value.data.map(item => item.productId)).size === value.data.length
  );
}
export function isCatalogFilters(value: unknown): value is CatalogFiltersDTO {
  return record(value) && Array.isArray(value.categories) && Array.isArray(value.brands) &&
    value.categories.every(item => record(item) && text(item.categoryId) && text(item.name)) &&
    value.brands.every(item => record(item) && text(item.brandId) && text(item.name)) &&
    new Set(value.categories.map(item => item.categoryId)).size === value.categories.length &&
    new Set(value.brands.map(item => item.brandId)).size === value.brands.length;
}
export class CatalogRequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function readCatalog<T>(
  path: string,
  validate: (value: unknown) => value is T,
  signal: AbortSignal,
): Promise<{ data: T; source: CatalogSource }> {
  const response = await fetch(`/api/catalog/${path}`, {
    signal,
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const code =
      record(payload) && typeof payload.code === "string"
        ? payload.code
        : "CATALOG_UNAVAILABLE";
    const message =
      code === "INVALID_SEARCH_QUERY"
        ? "Escribe entre 2 y 120 caracteres para buscar."
        : code === "INVALID_PAGE"
          ? "No encontramos esa página del catálogo. Vuelve a la primera página."
          : ["INVALID_PARAMETERS", "INVALID_FILTER", "INVALID_SORT", "INVALID_PRICE_RANGE"].includes(
                code,
              )
            ? "Revisa los criterios del enlace o vuelve al catálogo."
            : "No pudimos cargar el catálogo. Inténtalo nuevamente.";
    throw new CatalogRequestError(code, message);
  }
  if (!validate(payload))
    throw new CatalogRequestError(
      "INVALID_RESPONSE",
      "No pudimos cargar el catálogo. Inténtalo nuevamente.",
    );
  const source = response.headers.get("x-catalog-source");
  return {
    data: payload,
    source: source === "MOCK" || source === "REAL" ? source : "UNCONFIGURED",
  };
}
