import { CartItemThumbnail, useCartItemPresentation } from "@/features/cart/CartItemThumbnail";
import type { CartItemPreview } from "@/features/cart/types";

export function CheckoutItems({ items, cartItems = [] }: { items: CartItemPreview[]; cartItems?: CartItemPreview[] }) {
  const bySku = new Map(cartItems.map(item => [item.sku, item]));
  return <ul className="checkout-lines checkout-items" aria-label="Productos del pedido">
    {items.map(item => <CheckoutItem key={item.sku} item={{ ...bySku.get(item.sku), ...item }} />)}
  </ul>;
}

function CheckoutItem({ item }: { item: CartItemPreview }) {
  const { name, imageUrl, variantName } = useCartItemPresentation(item);
  return <li>
    <span className="checkout-item-photo" aria-hidden="true"><CartItemThumbnail imageUrl={imageUrl} /></span>
    <span className="checkout-item-info">
      <strong>{name}</strong>
      {variantName && <small>{variantName}</small>}
    </span>
    <span className="checkout-item-quantity" aria-label={`Cantidad: ${item.quantity}`}>×{item.quantity}</span>
  </li>;
}
