import type {
  ProductDetailErrorCode,
  ProductDetailResponseDTO,
  ProductMediaDTO,
} from "../types/product-detail.types";

/**
 * Contrato consumido (BFF Marketplace): `GET /api/v1/catalog/products/{slug}`
 * (spec API-F011-001). El navegador nunca llama a Productos y Ofertas: la
 * petición pasa por el proxy server-only de Next `/api/catalog/...`, que
 * reenvía al BFF con `MARKETPLACE_API_URL`.
 */
export const PRODUCT_DETAIL_PATH = "products";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

export class ProductDetailError extends Error {
  constructor(
    public code: ProductDetailErrorCode,
    public status: number,
  ) {
    super(code);
    this.name = "ProductDetailError";
  }
}

/** Validación local — no llama al BFF con slug inválido. */
export function isValidProductSlug(slug: string): boolean {
  return (
    slug.length >= 1 &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

function errorForStatus(status: number): ProductDetailError {
  if (status === 400) return new ProductDetailError("INVALID_PRODUCT_SLUG", 400);
  if (status === 404)
    return new ProductDetailError("PRODUCT_NOT_AVAILABLE", 404);
  if (status === 502)
    return new ProductDetailError("PRODUCT_CATALOG_INVALID_RESPONSE", 502);
  if (status === 503)
    return new ProductDetailError("PRODUCT_CATALOG_UNAVAILABLE", 503);
  if (status === 504)
    return new ProductDetailError("PRODUCT_CATALOG_TIMEOUT", 504);
  return new ProductDetailError("PRODUCT_CATALOG_UNAVAILABLE", status);
}

const HTTPS_URL = /^https:\/\/\S+$/u;

/**
 * Regla de medio (API-CA-F011-04 / funcional §7): sólo `IMAGE` con URL
 * HTTPS, `alt` no vacío y `displayOrder` entero no negativo. Lo inválido se
 * descarta; si no queda ningún medio, la respuesta se trata como inválida.
 */
export function isValidMedia(
  media: ProductMediaDTO | undefined,
): media is ProductMediaDTO {
  return Boolean(
    media &&
      media.type === "IMAGE" &&
      HTTPS_URL.test(media.url) &&
      media.alt?.trim() &&
      Number.isInteger(media.displayOrder) &&
      media.displayOrder >= 0,
  );
}

export async function fetchProductDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetailResponseDTO> {
  if (!isValidProductSlug(slug)) {
    throw new ProductDetailError("INVALID_PRODUCT_SLUG", 400);
  }

  const res = await fetch(
    `/api/catalog/${PRODUCT_DETAIL_PATH}/${encodeURIComponent(slug)}`,
    { signal, headers: { Accept: "application/json" } },
  );

  if (!res.ok) throw errorForStatus(res.status);

  let json: ProductDetailResponseDTO;
  try {
    json = (await res.json()) as ProductDetailResponseDTO;
  } catch {
    throw new ProductDetailError("PRODUCT_CATALOG_INVALID_RESPONSE", 502);
  }

  // Validación mínima: no mostrar ficha parcial engañosa. Los medios
  // inválidos se descartan y, si no queda ninguno, la respuesta es inválida.
  const media = json.data?.media?.filter(isValidMedia) ?? [];
  if (!json.data?.productId || !json.data?.name || !media.length) {
    throw new ProductDetailError("PRODUCT_CATALOG_INVALID_RESPONSE", 502);
  }

  return { ...json, data: { ...json.data, media } };
}
