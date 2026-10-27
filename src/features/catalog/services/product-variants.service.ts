import { readProblemCode } from "./problem-code";
import { isValidProductSlug } from "./product-detail.service";
import type {
  ProductVariantDTO,
  ProductVariantsDTO,
  ProductVariantsResponseDTO,
  VariantAttributeDTO,
  VariantErrorCode,
} from "../types/product-variants.types";

/**
 * Adaptador tipado F-013.
 *
 * Consume el proxy server-only `/api/catalog/products/{slug}/variants`. La
 * respuesta se valida antes de habilitar el selector: una variante sin SKU,
 * una combinación duplicada o un atributo incompleto no llegan a la UI.
 */
export const PRODUCT_VARIANTS_PATH = "variants";

const KNOWN_CODES: ReadonlySet<VariantErrorCode> = new Set([
  "INVALID_PRODUCT_SLUG",
  "PRODUCT_NOT_AVAILABLE",
  "CATALOG_INVALID_RESPONSE",
  "CATALOG_UNAVAILABLE",
  "CATALOG_TIMEOUT",
]);

export class ProductVariantsError extends Error {
  constructor(
    public code: VariantErrorCode,
    public status: number,
  ) {
    super(code);
    this.name = "ProductVariantsError";
  }
}

function errorForStatus(status: number): VariantErrorCode {
  if (status === 400) return "INVALID_PRODUCT_SLUG";
  if (status === 404) return "PRODUCT_NOT_AVAILABLE";
  if (status === 502) return "CATALOG_INVALID_RESPONSE";
  if (status === 504) return "CATALOG_TIMEOUT";
  return "CATALOG_UNAVAILABLE";
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isHttpsUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/\S+$/u.test(value);

function isAttribute(value: unknown): value is VariantAttributeDTO {
  if (!value || typeof value !== "object") return false;
  const attribute = value as VariantAttributeDTO;
  if (!isNonEmptyString(attribute.id) || !isNonEmptyString(attribute.label)) {
    return false;
  }
  if (!Array.isArray(attribute.values) || attribute.values.length === 0) {
    return false;
  }
  const ids = new Set<string>();
  for (const item of attribute.values) {
    if (
      !item ||
      typeof item !== "object" ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.label) ||
      ids.has(item.id)
    ) {
      return false;
    }
    ids.add(item.id);
  }
  return true;
}

function isVariant(value: unknown, attributeIds: string[]): value is ProductVariantDTO {
  if (!value || typeof value !== "object") return false;
  const variant = value as ProductVariantDTO;
  if (!isNonEmptyString(variant.variantId) || !isNonEmptyString(variant.sku)) {
    return false;
  }
  if (variant.status !== "ACTIVE") return false;
  if (
    variant.image !== null &&
    (!variant.image ||
      !isHttpsUrl(variant.image.url) ||
      !isNonEmptyString(variant.image.alt))
  ) {
    return false;
  }
  if (!variant.attributes || typeof variant.attributes !== "object") {
    return false;
  }
  if (Object.keys(variant.attributes).length !== attributeIds.length) {
    return false;
  }
  return attributeIds.every((id) => isNonEmptyString(variant.attributes[id]));
}

function isValidVariants(data: unknown): data is ProductVariantsDTO {
  if (!data || typeof data !== "object") return false;
  const value = data as ProductVariantsDTO;
  if (!isNonEmptyString(value.productId)) return false;
  if (typeof value.hasVariants !== "boolean") return false;
  if (!Array.isArray(value.attributes) || !Array.isArray(value.variants)) {
    return false;
  }

  if (!value.hasVariants) {
    return value.attributes.length === 0 && value.variants.length === 0;
  }
  if (value.attributes.length === 0 || value.variants.length === 0) return false;
  if (!value.attributes.every(isAttribute)) return false;

  const attributeIds = value.attributes.map((attribute) => attribute.id);
  if (new Set(attributeIds).size !== attributeIds.length) return false;

  const valuesByAttribute = new Map(
    value.attributes.map((attribute) => [
      attribute.id,
      new Set(attribute.values.map((item) => item.id)),
    ]),
  );
  const variantIds = new Set<string>();
  const skus = new Set<string>();
  const combinations = new Set<string>();

  for (const variant of value.variants) {
    if (!isVariant(variant, attributeIds)) return false;
    if (variantIds.has(variant.variantId) || skus.has(variant.sku)) return false;
    for (const attributeId of attributeIds) {
      if (!valuesByAttribute.get(attributeId)?.has(variant.attributes[attributeId])) {
        return false;
      }
    }
    const combination = attributeIds
      .map((id) => variant.attributes[id])
      .join("\u0000");
    if (combinations.has(combination)) return false;
    variantIds.add(variant.variantId);
    skus.add(variant.sku);
    combinations.add(combination);
  }
  return true;
}

export async function fetchProductVariants(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductVariantsResponseDTO> {
  if (!isValidProductSlug(slug)) {
    throw new ProductVariantsError("INVALID_PRODUCT_SLUG", 400);
  }

  const res = await fetch(
    `/api/catalog/products/${encodeURIComponent(slug)}/${PRODUCT_VARIANTS_PATH}`,
    { signal, headers: { Accept: "application/json" } },
  );

  if (!res.ok) {
    const code = await readProblemCode(res);
    throw new ProductVariantsError(
      code && KNOWN_CODES.has(code as VariantErrorCode)
        ? (code as VariantErrorCode)
        : errorForStatus(res.status),
      res.status,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ProductVariantsError("CATALOG_INVALID_RESPONSE", 502);
  }

  const body = json as ProductVariantsResponseDTO;
  if (!isValidVariants(body?.data)) {
    throw new ProductVariantsError("CATALOG_INVALID_RESPONSE", 502);
  }
  return body;
}

/** IDs de atributo en el orden publicado por el BFF. */
export function variantAttributeIds(data: ProductVariantsDTO): string[] {
  return data.attributes.map((attribute) => attribute.id);
}

/** `true` cuando todos los atributos identificadores tienen valor elegido. */
export function isSelectionComplete(
  data: ProductVariantsDTO,
  selection: Record<string, string>,
): boolean {
  return variantAttributeIds(data).every((id) => selection[id] !== undefined);
}

/** Variante activa cuya combinación coincide exactamente con la selección. */
export function findVariant(
  data: ProductVariantsDTO,
  selection: Record<string, string>,
): ProductVariantDTO | undefined {
  if (!isSelectionComplete(data, selection)) return undefined;
  return data.variants.find((variant) =>
    variantAttributeIds(data).every(
      (id) => variant.attributes[id] === selection[id],
    ),
  );
}
