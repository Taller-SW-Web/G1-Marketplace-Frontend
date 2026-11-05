// Real identity is the verified G7 UUID. A/B exist only in the local sandbox.
export type Identity = string | null;
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
  AUTH_UNAVAILABLE: "No pudimos comprobar tu sesión.",
  CART_CONFLICT: "El carrito está ocupado o el favorito ya no está disponible.",
  STOCK_LIMIT_REACHED: "No hay existencias suficientes.",
  COMMERCE_DATA_UNAVAILABLE: "Las condiciones de compra no están disponibles.",
  VARIANT_SELECTION_REQUIRED: "Selecciona una variante en la ficha del producto.",
  CART_RESULT_UNCERTAIN: "Revisa tu carrito antes de volver a agregar este producto.",
  INVALID_REQUEST: "La solicitud no es válida.",
  INVALID_PRODUCT_ID: "El identificador del producto no es válido.",
  UNAUTHORIZED: "Tu sesión terminó. Vuelve a iniciar sesión para continuar.",
  PRODUCT_NOT_AVAILABLE: "Este producto no está disponible para guardar.",
  CATALOG_UNAVAILABLE: "El servicio de productos no está disponible temporalmente.",
  INTERNAL_ERROR: "No pudimos completar la operación. Inténtalo de nuevo.",
  RESULT_UNCERTAIN: "No pudimos confirmar el resultado. Puedes repetir la operación manualmente.",
  FORBIDDEN: "La solicitud debe realizarse desde este sitio.",
  SANDBOX_DISABLED: "La sesión de prueba no está disponible en este entorno.",
  WISHLIST_UNAVAILABLE: "Tu lista todavía no está disponible. Inténtalo de nuevo más tarde.",
  INVALID_RESPONSE: "No pudimos leer tus favoritos. Inténtalo nuevamente.",
};
