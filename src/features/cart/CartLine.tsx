'use client';

import type { CartItemDTO } from './types';
import { Button } from '@/shared/ui/Button';

export interface CartLineProps {
  line: CartItemDTO;
  busy?: boolean;
  onQuantityChange?: (sku: string, qty: number) => void;
  onRemove?: (sku: string) => void;
  onMoveToWishlist?: (sku: string) => void;
}

/**
 * CMP-F019-002 · CartLine
 * Línea de producto dentro del carrito (V-008).
 * Compone visualmente cantidad, precio unitario y acciones sin cálculos externos.
 */
export function CartLine({
  line,
  busy = false,
  onQuantityChange,
  onRemove,
  onMoveToWishlist,
}: CartLineProps) {
  const priceFormatted = line.unitPrice
    ? `S/ ${line.unitPrice.amount.toFixed(2)} ${line.unitPrice.currency}`
    : 'Precio pendiente';

  const lineTotal = line.unitPrice
    ? `S/ ${(line.unitPrice.amount * line.quantity).toFixed(2)}`
    : 'Pendiente';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 99) {
      onQuantityChange?.(line.sku, val);
    }
  };

  return (
    <article className="cart-line-item" aria-label={`Producto ${line.name || line.sku}`}>
      <div className="cart-line-details">
        <div className="cart-line-header">
          <h3 className="cart-line-title">{line.name || line.sku}</h3>
          <span className="cart-line-sku">SKU: {line.sku}</span>
        </div>

        <div className="cart-line-pricing">
          <span className="cart-line-unit-price">{priceFormatted}</span>
          {line.quantity > 1 && (
            <span className="cart-line-total">Total línea: {lineTotal}</span>
          )}
        </div>
      </div>

      <div className="cart-line-controls">
        <div className="cart-quantity-selector" role="group" aria-label="Cantidad del producto">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || line.quantity <= 1}
            onClick={() => onQuantityChange?.(line.sku, line.quantity - 1)}
            aria-label="Disminuir cantidad"
          >
            -
          </Button>
          <input
            type="number"
            min={1}
            max={99}
            value={line.quantity}
            onChange={handleInputChange}
            disabled={busy}
            className="cart-quantity-input"
            aria-label={`Cantidad de ${line.name || line.sku}`}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || line.quantity >= 99}
            onClick={() => onQuantityChange?.(line.sku, line.quantity + 1)}
            aria-label="Aumentar cantidad"
          >
            +
          </Button>
        </div>

        <div className="cart-line-actions">
          {onMoveToWishlist && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              disabled={busy}
              onClick={() => onMoveToWishlist(line.sku)}
            >
              Guardar para después
            </Button>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              disabled={busy}
              onClick={() => onRemove(line.sku)}
              className="cart-remove-btn"
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
