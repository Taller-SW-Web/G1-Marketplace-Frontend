'use client';

import { useId } from 'react';
import { Button } from '@/shared/ui/Button';
import type { AddToCartActionProps } from './types';

/**
 * CMP-F016-001 · AddToCartAction
 * Acción única de adición al carrito (1 unidad por pulsación confirmada).
 * Cumple con DS-001 (área táctil >= 44px, contraste AA, aria-live).
 */
export function AddToCartAction({
  productId,
  availability,
  priceReady,
  busy,
  onAdd,
  onRetryAvailability,
}: AddToCartActionProps) {
  const hintId = useId();

  // Validación de estados
  const isUnselected = availability === 'UNSELECTED' || !productId;
  const isUnavailable = availability === 'UNAVAILABLE';
  const isActionDisabled = isUnselected || isUnavailable || !priceReady || busy;

  const handleClick = () => {
    if (isActionDisabled || !productId) return;
    onAdd({ productId, quantity: 1 });
  };

  // Texto de ayuda descriptivo para accesibilidad
  let hintText: string | null = null;
  if (isUnselected) {
    hintText = 'Selecciona una talla o variante para agregar al carrito.';
  } else if (isUnavailable) {
    hintText = 'Este producto se encuentra actualmente agotado.';
  } else if (!priceReady) {
    hintText = 'Consultando precio actualizado…';
  }

  return (
    <div className="add-to-cart-action-container">
      <div className="add-to-cart-button-row">
        <Button
          type="button"
          variant="primary"
          size="md"
          fullWidth
          disabled={isActionDisabled}
          loading={busy}
          loadingLabel="Agregando al carrito…"
          onClick={handleClick}
          aria-describedby={hintText ? hintId : undefined}
          aria-busy={busy}
          className="add-to-cart-btn"
        >
          Agregar al carrito
        </Button>

        {isUnavailable && onRetryAvailability && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onRetryAvailability}
            className="retry-availability-btn"
          >
            Reintentar disponibilidad
          </Button>
        )}
      </div>

      {hintText && (
        <p
          id={hintId}
          role={isUnavailable ? 'alert' : 'status'}
          className={`add-to-cart-hint ${isUnavailable ? 'add-to-cart-hint--warning' : ''}`}
        >
          {hintText}
        </p>
      )}
    </div>
  );
}
