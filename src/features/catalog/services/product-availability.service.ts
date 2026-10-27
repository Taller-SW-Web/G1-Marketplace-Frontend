import { readProblemCode } from "./problem-code";
import { isValidProductSlug } from "./product-detail.service";
import {
  COMMERCIAL_AVAILABILITY,
  type AvailabilityErrorCode,
  type CommercialAvailability,
  type ProductAvailabilityDTO,
  type ProductAvailabilityResponseDTO,
} from "../types/product-availability.types";

/**
 * Adaptador tipado F-014.
 *
 * Consume `/api/catalog/products/{slug}/availability?sku=...`. Sólo acepta los
 * tres estados comerciales homologados: un estado externo desconocido (por
 * ejemplo `INDETERMINADO`, pendiente de G-G6-COMPAT) no se publica como si
 * fuera uno de ellos.
 */
export const PRODUCT_AVAILABILITY_PATH = "availability";

const KNOWN_CODES: ReadonlySet<AvailabilityErrorCode> = new Set([
  "INVALID_PRODUCT_SLUG",
  "PRODUCT_NOT_AVAILABLE",
  "PRODUCT_VARIANT_SELECTION_REQUIRED",
  "SKU_NOT_BELONG_TO_PRODUCT",
  "INVENTORY_INVALID_RESPONSE",
  "INVENTORY_UNAVAILABLE",
  "INVENTORY_TIMEOUT",
]);

export class ProductAvailabilityError extends Error {
  constructor(
    public code: AvailabilityErrorCode,
    public status: number,
  ) {
    super(code);
    this.name = "ProductAvailabilityError";
  }
}

function errorForStatus(status: number): AvailabilityErrorCode {
  if (status === 400) return "INVALID_PRODUCT_SLUG";
  if (status === 404) return "PRODUCT_NOT_AVAILABLE";
  if (status === 409) return "PRODUCT_VARIANT_SELECTION_REQUIRED";
  if (status === 502) return "INVENTORY_INVALID_RESPONSE";
  if (status === 504) return "INVENTORY_TIMEOUT";
  return "INVENTORY_UNAVAILABLE";
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  !Number.isNaN(Date.parse(value));

const isCommercialAvailability = (
  value: unknown,
): value is CommercialAvailability =>
  typeof value === "string" &&
  (COMMERCIAL_AVAILABILITY as readonly string[]).includes(value);

function isValidAvailability(
  data: unknown,
): data is ProductAvailabilityDTO {
  if (!data || typeof data !== "object") return false;
  const value = data as ProductAvailabilityDTO;
  if (!isNonEmptyString(value.productId) || !isNonEmptyString(value.sku)) {
    return false;
  }
  if (!isCommercialAvailability(value.availability)) return false;
  if (!isIsoDate(value.checkedAt)) return false;
  if (
    "quantity" in value ||
    "onHand" in value ||
    "reserved" in value ||
    "locationId" in value
  ) {
    return false;
  }
  return true;
}

export async function fetchProductAvailability(
  slug: string,
  sku: string | undefined,
  signal?: AbortSignal,
): Promise<ProductAvailabilityResponseDTO> {
  if (!isValidProductSlug(slug)) {
    throw new ProductAvailabilityError("INVALID_PRODUCT_SLUG", 400);
  }

  const trimmedSku = sku?.trim();
  const query =
    trimmedSku && trimmedSku.length > 0
      ? `?sku=${encodeURIComponent(trimmedSku)}`
      : "";

  const res = await fetch(
    `/api/catalog/products/${encodeURIComponent(slug)}/${PRODUCT_AVAILABILITY_PATH}${query}`,
    { signal, headers: { Accept: "application/json" } },
  );

  if (!res.ok) {
    const code = await readProblemCode(res);
    throw new ProductAvailabilityError(
      code && KNOWN_CODES.has(code as AvailabilityErrorCode)
        ? (code as AvailabilityErrorCode)
        : errorForStatus(res.status),
      res.status,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ProductAvailabilityError("INVENTORY_INVALID_RESPONSE", 502);
  }

  const body = json as ProductAvailabilityResponseDTO;
  if (!isValidAvailability(body?.data)) {
    throw new ProductAvailabilityError("INVENTORY_INVALID_RESPONSE", 502);
  }
  return body;
}
