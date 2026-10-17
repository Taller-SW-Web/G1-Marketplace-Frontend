export type Identity = "A" | "B" | null;
export type Session = { identity: Identity; scope: string; enabled: boolean };
export type Confirmed = "unknown" | "saved" | "absent";
export type Operation = "save" | "remove";
export type ItemState = {
  confirmed: Confirmed;
  pending?: Operation;
  message?: string;
  error?: boolean;
  uncertain?: boolean;
  retry?: Operation;
};
export const unknownItem: ItemState = { confirmed: "unknown" };
export function getItemState(items: Record<string, ItemState>, productId: string): ItemState {
  return Object.hasOwn(items, productId) ? items[productId] : unknownItem;
}

export function isProductId(value: unknown): value is string {
  return typeof value === "string" && [...value].length >= 1 && [...value].length <= 100
    && value.trim() === value && ![...value].some(character => {
      const code = character.codePointAt(0)!;
      return code <= 31 || (code >= 127 && code <= 159);
    });
}

export const publicErrors: Record<string, string> = {
  INVALID_REQUEST: "La solicitud no es válida.",
  INVALID_PRODUCT_ID: "El identificador del producto no es válido.",
  UNAUTHORIZED: "Tu sesión de prueba terminó. Vuelve a seleccionarla; si venció el token, genera uno nuevo.",
  PRODUCT_NOT_AVAILABLE: "Este producto no está disponible para guardar.",
  CATALOG_UNAVAILABLE: "El servicio de productos no está disponible temporalmente.",
  INTERNAL_ERROR: "No pudimos completar la operación. Inténtalo de nuevo.",
  RESULT_UNCERTAIN: "No pudimos confirmar el resultado. Puedes repetir la operación manualmente.",
  FORBIDDEN: "La solicitud debe realizarse desde este sitio.",
  SANDBOX_DISABLED: "La sesión de prueba no está disponible en este entorno.",
  WISHLIST_UNAVAILABLE: "Tu lista todavía no está disponible. Inténtalo de nuevo más tarde.",
  INVALID_RESPONSE: "No pudimos leer tus favoritos. Inténtalo nuevamente.",
  STOCK_LIMIT_REACHED: "No hay existencias suficientes para mover este producto. Sigue en tus favoritos.",
  VARIANT_SELECTION_REQUIRED: "Elige una variante en la ficha antes de agregar este producto al carrito.",
  CART_CONFLICT: "El carrito cambió. Revisa su contenido antes de continuar.",
  COMMERCE_DATA_UNAVAILABLE: "No pudimos comprobar las condiciones de compra. Inténtalo nuevamente.",
  IDEMPOTENCY_CONFLICT: "No pudimos identificar este intento. Revisa el carrito antes de continuar.",
  OPERATION_IN_PROGRESS: "El movimiento sigue en curso. Puedes volver a comprobar el mismo intento.",
};
