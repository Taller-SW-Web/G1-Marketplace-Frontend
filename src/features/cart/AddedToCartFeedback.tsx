'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/shared/ui/Button';
import type { AddedToCartFeedbackProps } from './types';

/**
 * CMP-F016-002 · AddedToCartFeedback (Overlay O-005)
 * Toast/banner no intrusivo que confirma la adición o explica el ajuste de cantidad.
 * Respeta DS-001: no roba foco, aria-live="polite", temporizador pausado al hover/foco.
 * REGLA ESTRICTA (UI-O005-004): NO muestra subtotal ni total final de checkout.
 */
export function AddedToCartFeedback({
  result,
  opened,
  onViewCart,
  onContinue,
  onClose,
}: AddedToCartFeedbackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      onContinue();
    }
  }, [onClose, onContinue]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setTimeout(() => {
      handleClose();
    }, 6000);
  }, [stopTimer, handleClose]);

  useEffect(() => {
    if (opened && result?.success) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [opened, result, startTimer, stopTimer]);

  // Manejo de teclado (Escape para cerrar)
  useEffect(() => {
    if (!opened) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, handleClose]);

  if (!opened || !result) {
    return null;
  }

  const isAdjusted = result.code === 'STOCK_LIMIT_REACHED' || result.status === 409;
  const isCreated = result.code === 'ITEM_CREATED' || result.status === 201;

  const titleText = isAdjusted
    ? 'Ajustamos la cantidad disponible en tu carrito'
    : 'Producto agregado al carrito';

  const descriptionText = isAdjusted
    ? (result.message || 'Se alcanzó el límite máximo de stock permitido para este producto.')
    : isCreated
      ? `Agregaste 1 unidad a tu carrito.`
      : `Cantidad total confirmada en tu carrito: ${result.item?.quantity ?? 'actualizada'}.`;

  return (
    <div
      ref={containerRef}
      role={isAdjusted ? 'alert' : 'status'}
      aria-live="polite"
      className={`added-to-cart-feedback-banner ${isAdjusted ? 'added-to-cart-feedback-banner--adjusted' : ''}`}
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
      onFocus={stopTimer}
      onBlur={startTimer}
      data-testid="added-to-cart-feedback"
    >
      <div className="feedback-content">
        <div className="feedback-icon-area" aria-hidden="true">
          {isAdjusted ? (
            <span className="feedback-badge feedback-badge--warning">⚠️</span>
          ) : (
            <span className="feedback-badge feedback-badge--success">✓</span>
          )}
        </div>

        <div className="feedback-text-area">
          <h3 className="feedback-title">{titleText}</h3>
          {result.item?.name && (
            <p className="feedback-product-name">{result.item.name}</p>
          )}
          <p className="feedback-description">{descriptionText}</p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="feedback-close-btn"
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      </div>

      <div className="feedback-actions">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onViewCart}
          className="feedback-view-cart-btn"
        >
          Ver carrito
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClose}
          className="feedback-continue-btn"
        >
          Seguir comprando
        </Button>
      </div>
    </div>
  );
}
