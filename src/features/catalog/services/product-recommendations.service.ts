import { isValidProductSlug } from "./product-detail.service";
import type {
  RecommendationCardDTO,
  RecommendationsResponseDTO,
} from "../types/product-recommendations.types";

/**
 * Adaptador tipado F-015.
 *
 * La región es no crítica: un fallo de transporte, una respuesta inválida o
 * un arreglo vacío se resuelven a `[]` y la sección se omite completa. Nunca
 * se muestra un error invasivo ni un precio inventado.
 */
export const PRODUCT_RECOMMENDATIONS_PATH = "recommendations";

export const MAX_RECOMMENDATIONS = 8;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ISO_4217 = /^[A-Z]{3}$/u;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPositiveAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function isCard(value: unknown): value is RecommendationCardDTO {
  if (!value || typeof value !== "object") return false;
  const card = value as RecommendationCardDTO;
  if (!isNonEmptyString(card.productId) || !isNonEmptyString(card.name)) {
    return false;
  }
  if (
    !isNonEmptyString(card.slug) ||
    card.slug.length > 120 ||
    !SLUG_PATTERN.test(card.slug)
  ) {
    return false;
  }
  if (
    !card.image ||
    !isNonEmptyString(card.image.url) ||
    !/^https:\/\/\S+$/u.test(card.image.url) ||
    !isNonEmptyString(card.image.alt)
  ) {
    return false;
  }
  if (card.type !== "CROSS_SELL" && card.type !== "UPSELL") return false;
  if (!Number.isInteger(card.presentationOrder) || card.presentationOrder < 0) {
    return false;
  }
  if (card.price !== null) {
    if (!card.price || typeof card.price !== "object") return false;
    if (!isPositiveAmount(card.price.amount)) return false;
    if (
      typeof card.price.currency !== "string" ||
      !ISO_4217.test(card.price.currency)
    ) {
      return false;
    }
  }
  if ("stock" in card || "availability" in card) return false;
  return true;
}

function validate(
  value: unknown,
  sourceProductId: string,
): RecommendationCardDTO[] {
  if (!value || typeof value !== "object") return [];
  const body = value as RecommendationsResponseDTO;
  if (!Array.isArray(body.data) || !body.meta || typeof body.meta !== "object") {
    return [];
  }
  if (body.data.length > MAX_RECOMMENDATIONS) return [];

  const seen = new Set<string>();
  const cards: RecommendationCardDTO[] = [];
  for (const card of body.data) {
    if (!isCard(card)) return [];
    if (card.productId === sourceProductId) return [];
    if (seen.has(card.productId)) return [];
    seen.add(card.productId);
    cards.push(card);
  }
  return cards;
}

export async function fetchRelatedProducts(
  slug: string,
  signal?: AbortSignal,
): Promise<RecommendationCardDTO[]> {
  if (!isValidProductSlug(slug)) return [];

  try {
    const res = await fetch(
      `/api/catalog/products/${encodeURIComponent(slug)}/${PRODUCT_RECOMMENDATIONS_PATH}`,
      { signal, headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const body = json as RecommendationsResponseDTO;
    const sourceProductId =
      body && typeof body === "object" && body.meta
        ? body.meta.sourceProductId
        : "";
    return validate(json, sourceProductId);
  } catch {
    return [];
  }
}
