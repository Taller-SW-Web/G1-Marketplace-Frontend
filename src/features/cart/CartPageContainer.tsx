'use client';

import Link from 'next/link';
import type { CartSnapshot } from './types';
import { CartLine } from './CartLine';
import { CartSubtotal } from './CartSubtotal';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Button } from '@/shared/ui/Button';

export interface CartPageContainerProps {
  cart: CartSnapshot | null;
  status: 'loading' | 'ready' | 'empty' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
  onCheckout?: () => void;
  onQuantityChange?: (sku: string, qty: number) => void;
  onRemove?: (sku: string) => void;
  isBusy?: boolean;
}

/**
 * CMP-F019-001 · CartPageContainer
 * Vista principal del Carrito de Compras (V-008).
 * REGLA ESTRICTA (RC-F-019-01): Carrito vacío NUNCA renderiza el resumen ni el CTA de checkout.
 */
export function CartPageContainer({
  cart,
  status,
  errorMessage,
  onRetry,
  onCheckout = () => {},
  onQuantityChange,
  onRemove,
  isBusy = false,
}: CartPageContainerProps) {
  if (status === 'loading') {
    return (
      <main className="cart-page-container container" aria-busy="true">
        <h1 className="cart-page-title">Carrito de compras</h1>
        <div className="cart-loading-state" role="status" aria-label="Cargando tu carrito">
          <p>Cargando productos de tu carrito…</p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="cart-page-container container">
        <h1 className="cart-page-title">Carrito de compras</h1>
        <div className="cart-error-state" role="alert">
          <p>{errorMessage || 'No pudimos cargar la información de tu carrito.'}</p>
          {onRetry && (
            <Button type="button" variant="primary" onClick={onRetry}>
              Reintentar carga
            </Button>
          )}
        </div>
      </main>
    );
  }

  const items = cart?.items ?? [];
  const isEmpty = status === 'empty' || items.length === 0;

  if (isEmpty) {
    return (
      <main className="cart-page-container container">
        <h1 className="cart-page-title">Carrito de compras</h1>
        <EmptyState
          title="Tu carrito está vacío"
          description="Aún no has agregado productos. Explora nuestra tienda y encuentra el mejor equipamiento deportivo."
          icon="🛒"
          actions={
            <Link href="/catalogo">
              <Button type="button" variant="primary">
                Explorar catálogo
              </Button>
            </Link>
          }
        />
      </main>
    );
  }

  // Calcular subtotal si todos los ítems tienen precio disponible
  const hasIncompletePrices = items.some((it) => !it.unitPrice);
  const subtotal = hasIncompletePrices
    ? null
    : {
        amount: items.reduce((acc, it) => acc + (it.unitPrice?.amount ?? 0) * it.quantity, 0),
        currency: items[0]?.unitPrice?.currency || 'PEN',
      };

  return (
    <main className="cart-page-container container">
      <div className="cart-header-row">
        <h1 className="cart-page-title">Carrito de compras</h1>
        <span className="cart-items-count-badge">
          {items.reduce((acc, it) => acc + it.quantity, 0)} {items.length === 1 ? 'artículo' : 'artículos'}
        </span>
      </div>

      <div className="cart-grid-layout">
        {/* Listado de ítems */}
        <section className="cart-lines-list" aria-label="Productos en tu carrito">
          {items.map((line) => (
            <CartLine
              key={line.sku}
              line={line}
              busy={isBusy}
              onQuantityChange={onQuantityChange}
              onRemove={onRemove}
            />
          ))}
        </section>

        {/* Resumen del pedido (Subtotal) */}
        <CartSubtotal
          subtotal={subtotal}
          canCheckout={!hasIncompletePrices && items.length > 0}
          onCheckout={onCheckout}
          isBusy={isBusy}
        />
      </div>
    </main>
  );
}
