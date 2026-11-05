"use client";
import { AddToCartAction } from "@/features/cart/AddToCartAction";
import type {
  AddToCartPayload,
  AvailabilityState,
} from "@/features/cart/types";
import { useProductAvailability } from "../hooks/useProductAvailability";
import { useProductPrice } from "../hooks/useProductPrice";
import { useProductVariants } from "../hooks/useProductVariants";
import type { ProductAvailabilityState } from "../types/product-availability.types";
import { AvailabilityRegion } from "./AvailabilityRegion";
import { ProductPriceRegion } from "./ProductPriceRegion";
import { ProductVariantsRegion } from "./ProductVariantsRegion";

interface Props {
  slug: string;
  productId: string;
  showCart: boolean;
  busy: boolean;
  onAdd: (payload: AddToCartPayload) => void;
}

/**
 * Coordina la región comercial de la ficha (F-012…F-014):
 *
 *   - F-013 resuelve el SKU de la combinación elegida.
 *   - F-012 y F-014 sólo consultan cuando existe un SKU aplicable; al cambiar
 *     la selección retiran el importe y el estado anteriores.
 *   - El CTA de F-016 se deshabilita con agotado o precio no disponible, pero
 *     un error de inventario nunca se presenta como agotado.
 *
 * F-015 se carga aparte (`RelatedProductsRegion`) para no bloquear la ficha.
 */
export function ProductCommerce({
  slug,
  productId,
  showCart,
  busy,
  onAdd,
}: Props) {
  const variants = useProductVariants(slug);

  // Mientras las variantes cargan no se sabe si el producto es simple: se
  // espera el SKU para no consultar un precio ajeno.
  const requiresVariant =
    variants.state.kind === "loading" ||
    variants.state.kind === "selecting" ||
    variants.state.kind === "valid";

  const selectedSku =
    variants.state.kind === "valid" ? variants.state.variant.sku : undefined;

  const price = useProductPrice(slug, selectedSku, requiresVariant);
  const availability = useProductAvailability(
    slug,
    selectedSku,
    requiresVariant,
  );

  const priceReady =
    price.state.kind === "regular" || price.state.kind === "sale";
  const cartAvailability = toCartAvailability(availability.state);

  return (
    <div className="product-commerce">
      <ProductVariantsRegion
        state={variants.state}
        selection={variants.selection}
        onSelectionChange={variants.select}
        onRetry={variants.retry}
      />

      <ProductPriceRegion state={price.state} retry={price.retry} />

      <AvailabilityRegion
        state={availability.state}
        retry={availability.retry}
      />

      {showCart && cartAvailability && (
        <div className="detail-cart-action-wrapper">
          <AddToCartAction
            productId={productId}
            availability={cartAvailability}
            priceReady={priceReady}
            busy={busy}
            onAdd={onAdd}
            onRetryAvailability={availability.retry}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Traducción de estados comerciales al indicio que consume F-016. ERROR y
 * LOADING no habilitan compra; `null` evita mostrar un CTA engañoso.
 */
export function toCartAvailability(
  state: ProductAvailabilityState,
): AvailabilityState | null {
  if (state.kind === "waiting_for_sku") return "UNSELECTED";
  if (state.kind !== "ready") return null;
  if (state.availability === "AVAILABLE") return "AVAILABLE";
  if (state.availability === "STOCK_LOW") return "STOCK_LOW";
  return "UNAVAILABLE";
}
