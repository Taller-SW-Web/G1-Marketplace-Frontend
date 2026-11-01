'use client';

import { useState, useEffect } from 'react';
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
 * CMP-F019-002 / CMP-F017-001 · CartLine & QuantityStepper
 * Línea de producto dentro del carrito (V-008).
 * Mantiene draftQuantity local para edición numérica y envía la mutación
 * al presionar Enter o perder el foco (blur) con validación estricta de enteros 1-99.
 */
export function CartLine({
  line,
  busy = false,
  onQuantityChange,
  onRemove,
  onMoveToWishlist,
}: CartLineProps) {
  const [draftQuantity, setDraftQuantity] = useState(String(line.quantity));

  useEffect(() => {
    setDraftQuantity(String(line.quantity));
  }, [line.quantity]);

  const priceFormatted = line.unitPrice
    ? "S/ " + line.unitPrice.amount.toFixed(2) + " " + line.unitPrice.currency
    : 'Precio pendiente';

  const lineTotal = line.unitPrice
    ? "S/ " + (line.unitPrice.amount * line.quantity).toFixed(2)
    : 'Pendiente';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftQuantity(e.target.value);
  };

  const commitDraft = () => {
    const trimmed = draftQuantity.trim();
    // Validación estricta: solo enteros positivos sin decimales ni ceros
    if (!/^[1-9]\d*$/.test(trimmed)) {
      setDraftQuantity(String(line.quantity));
      return;
    }
    const val = Number(trimmed);
    if (!Number.isInteger(val) || val < 1 || val > 99) {
      setDraftQuantity(String(line.quantity));
      return;
    }
    if (val !== line.quantity) {
      onQuantityChange?.(line.sku, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      commitDraft();
    } else if (e.key === 'Escape') {
      setDraftQuantity(String(line.quantity));
    }
  };

  return (
    <article className="cart-line-item" aria-label={"Producto " + (line.name || line.sku)}>
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
            value={draftQuantity}
            onChange={handleInputChange}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
            disabled={busy}
            className="cart-quantity-input"
            aria-label={"Cantidad de " + (line.name || line.sku)}
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
