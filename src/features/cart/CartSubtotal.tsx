'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui/Button';

export interface CartSubtotalProps {
  subtotal: { amount: number; currency: string } | null;
  canCheckout: boolean;
  onCheckout: () => void;
  isBusy?: boolean;
  /** Unidades en el carrito; solo para el desglose visual del resumen. */
  itemCount?: number;
}

/**
 * CMP-F019-003 · CartSubtotal
 * Resumen del subtotal informativo del carrito (V-008).
 * REGLA ESTRICTA (RC-F-019-02): subtotal null jamás se muestra como gratuito (S/ 0.00).
 */
export function CartSubtotal({
  subtotal,
  canCheckout,
  onCheckout,
  isBusy = false,
  itemCount,
}: CartSubtotalProps) {
  const isPending = subtotal === null;
  const isCheckoutDisabled = isPending || !canCheckout || isBusy;

  return (
    <aside className="cart-subtotal-card" aria-label="Resumen de compra">
      <h2 className="cart-subtotal-title">Resumen de tu pedido</h2>

      {itemCount !== undefined && (
        <dl className="cart-subtotal-breakdown">
          <div>
            <dt>Productos ({itemCount})</dt>
            <dd>{isPending ? 'Por confirmar' : `S/ ${subtotal.amount.toFixed(2)}`}</dd>
          </div>
          <div>
            <dt>Envío</dt>
            <dd>Se calcula en el checkout</dd>
          </div>
        </dl>
      )}

      <div className="cart-subtotal-row">
        <span>Subtotal estimado</span>
        {isPending ? (
          <span className="cart-subtotal-pending" role="status">
            Calculando importe…
          </span>
        ) : (
          <span className="cart-subtotal-amount">
            S/ {subtotal.amount.toFixed(2)} {subtotal.currency}
          </span>
        )}
      </div>

      <p className="cart-subtotal-note">
        Los costos de envío e impuestos definitivos se calcularán durante el proceso de pago.
      </p>

      <div className="cart-subtotal-cta">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isCheckoutDisabled}
          loading={isBusy}
          loadingLabel="Iniciando compra…"
          onClick={onCheckout}
        >
          Iniciar Checkout
        </Button>
        <Link className="cart-continue-link" href="/catalogo">Seguir comprando</Link>
      </div>
    </aside>
  );
}
