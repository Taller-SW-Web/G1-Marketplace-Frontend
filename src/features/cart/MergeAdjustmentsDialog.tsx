'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from '@/shared/ui/Button';
import type { MergeAdjustmentsDialogProps } from './types';

/**
 * CMP-F020-003: MergeAdjustmentsDialog
 * Diálogo accesible (O-007) para informar ajustes de cantidades por límite de stock
 * o políticas comerciales tras la fusión de carritos (CA-F020-03).
 */
export function MergeAdjustmentsDialog({
  adjustments,
  opened,
  onViewCart,
  onClose,
}: MergeAdjustmentsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const visible = opened && adjustments.length > 0;

  useEffect(() => {
    const element = dialog.current;
    if (!visible || !element) return;
    element.showModal();
    dismissButton.current?.focus();
    return () => { if (element.open) element.close(); };
  }, [visible]);

  if (!visible) return null;

  function dismiss() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="cart-merge-dialog"
      onCancel={event => {
        event.preventDefault();
        dismiss();
      }}
    >
      <h2 id={titleId}>Ajustes en tu carrito</h2>
      <p id={descriptionId}>
        Al combinar tus productos de invitado con tu cuenta, realizamos los siguientes ajustes por disponibilidad de stock:
      </p>

      <ul className="cart-merge-adjustments">
        {adjustments.map((adjustment) => (
          <li key={adjustment.sku}>
            <div>
              <strong>{adjustment.sku}</strong>
              <span>Solicitaste {adjustment.requestedQuantity} · Ajustado a {adjustment.confirmedQuantity}</span>
            </div>
            <span className="cart-merge-stock-label">Límite de stock</span>
          </li>
        ))}
      </ul>

      <div className="cart-merge-actions">
        {onViewCart && (
          <Button variant="primary" onClick={() => {
            dialog.current?.close();
            onViewCart();
          }}>
            Ver carrito
          </Button>
        )}
        <Button variant="secondary" ref={dismissButton} onClick={dismiss}>
          Entendido
        </Button>
      </div>
    </dialog>
  );
}

