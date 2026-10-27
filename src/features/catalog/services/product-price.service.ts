import { readProblemCode } from "./problem-code";
import { isValidProductSlug } from "./product-detail.service";
import type {
  PriceDTO,
  ProductPriceErrorCode,
  ProductPriceResponseDTO,
} from "../types/product-price.types";

/**
 * Adaptador tipado F-012.
 *
 * El navegador nunca llama a Pricing: consume el proxy server-only
 * `/api/catalog/products/{slug}/price` que reenvía al BFF Marketplace.
 * La respuesta se valida antes de mostrarse; una oferta vencida se degrada a
 * precio regular sin dejar un descuento visual huérfano.
 */
export const PRODUCT_PRICE_PATH = "price";

const ISO_4217 = /^[A-Z]{3}$/u;

const KNOWN_CODES: ReadonlySet<ProductPriceErrorCode> = new Set([
  "INVALID_PRODUCT_SLUG",
  "PRODUCT_NOT_AVAILABLE",
  "PRODUCT_VARIANT_SELECTION_REQUIRED",
  "SKU_NOT_BELONG_TO_PRODUCT",
  "PRICE_NOT_AVAILABLE",
  "PRICING_INVALID_RESPONSE",
  "PRICING_UNAVAILABLE",
  "PRICING_TIMEOUT",
]);

export class ProductPriceError extends Error {
  constructor(
    public code: ProductPriceErrorCode,
    public status: number,
  ) {
    super(code);
    this.name = "ProductPriceError";
  }
}

function errorForStatus(status: number): ProductPriceErrorCode {
  if (status === 400) return "INVALID_PRODUCT_SLUG";
  if (status === 404) return "PRODUCT_NOT_AVAILABLE";
  if (status === 409) return "PRODUCT_VARIANT_SELECTION_REQUIRED";
  if (status === 422) return "PRICE_NOT_AVAILABLE";
  if (status === 502) return "PRICING_INVALID_RESPONSE";
  if (status === 503) return "PRICING_UNAVAILABLE";
  if (status === 504) return "PRICING_TIMEOUT";
  return "PRICING_UNAVAILABLE";
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** RN-F012-02: una oferta sólo se presenta dentro de su vigencia. */
export function normalizePrice(price: PriceDTO, now: Date): PriceDTO {
  if (price.saleAmount === null) return price;

  const from = Date.parse(price.validFrom);
  const until =
    price.validUntil === null ? null : Date.parse(price.validUntil);
  const active =
    !Number.isNaN(from) &&
    (until === null || !Number.isNaN(until)) &&
    from <= now.getTime() &&
    (until === null || now.getTime() < until);

  return active
    ? price
    : { ...price, saleAmount: null, discountPercent: null, validUntil: null };
}

function isValidPrice(price: unknown): price is PriceDTO {
  if (!price || typeof price !== "object") return false;
  const value = price as PriceDTO;
  if (!isPositiveAmount(value.regularAmount)) return false;
  if (typeof value.currency !== "string" || !ISO_4217.test(value.currency)) {
    return false;
  }
  if (!isIsoDate(value.validFrom)) return false;
  if (!Number.isInteger(value.priceVersion) || value.priceVersion < 0) {
    return false;
  }

  if (value.saleAmount === null) {
    if (value.discountPercent !== null) return false;
  } else {
    if (!isPositiveAmount(value.saleAmount)) return false;
    if (value.saleAmount >= value.regularAmount) return false;
    if (
      !Number.isInteger(value.discountPercent) ||
      (value.discountPercent as number) < 0 ||
      (value.discountPercent as number) > 100
    ) {
      return false;
    }
  }

  if (value.validUntil !== null) {
    if (!isIsoDate(value.validUntil)) return false;
    if (Date.parse(value.validUntil) < Date.parse(value.validFrom)) return false;
  }

  return true;
}

function validateResponse(
  value: unknown,
  now: Date,
): ProductPriceResponseDTO {
  if (!value || typeof value !== "object") {
    throw new ProductPriceError("PRICING_INVALID_RESPONSE", 502);
  }
  const response = value as ProductPriceResponseDTO;
  if (
    !response.data ||
    typeof response.data.productId !== "string" ||
    response.data.productId.length === 0 ||
    typeof response.data.sku !== "string" ||
    response.data.sku.length === 0 ||
    !isValidPrice(response.data.price)
  ) {
    throw new ProductPriceError("PRICING_INVALID_RESPONSE", 502);
  }
  if (
    !response.meta ||
    response.meta.channel !== "MARKETPLACE" ||
    !isIsoDate(response.meta.retrievedAt)
  ) {
    throw new ProductPriceError("PRICING_INVALID_RESPONSE", 502);
  }

  return {
    ...response,
    data: {
      ...response.data,
      price: normalizePrice(response.data.price, now),
    },
  };
}

export async function fetchProductPrice(
  slug: string,
  sku?: string,
  signal?: AbortSignal,
): Promise<ProductPriceResponseDTO> {
  if (!isValidProductSlug(slug)) {
    throw new ProductPriceError("INVALID_PRODUCT_SLUG", 400);
  }

  const trimmedSku = sku?.trim();
  const query =
    trimmedSku && trimmedSku.length > 0
      ? `?sku=${encodeURIComponent(trimmedSku)}`
      : "";

  const res = await fetch(
    `/api/catalog/products/${encodeURIComponent(slug)}/${PRODUCT_PRICE_PATH}${query}`,
    { signal, headers: { Accept: "application/json" } },
  );

  if (!res.ok) {
    const code = await readProblemCode(res);
    throw new ProductPriceError(
      code && KNOWN_CODES.has(code as ProductPriceErrorCode)
        ? (code as ProductPriceErrorCode)
        : errorForStatus(res.status),
      res.status,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ProductPriceError("PRICING_INVALID_RESPONSE", 502);
  }

  return validateResponse(json, new Date());
}
