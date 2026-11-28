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
          <p className="cart-loading-banner">Cargando productos de tu carrito…</p>
          <div className="cart-skeleton-column" aria-hidden="true">
            <div className="cart-skeleton-card" />
            <div className="cart-skeleton-card" />
          </div>
          <div className="cart-skeleton-summary" aria-hidden="true" />
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
        <div className="cart-empty-wrapper">
          <EmptyState
            title="Tu carrito está vacío"
            description="Aún no has agregado productos. Explora nuestra tienda y encuentra el mejor equipamiento deportivo."
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l-1.2 12.1a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9L6 7Z" />
                <path d="M9 7V6a3 3 0 0 1 6 0v1" />
              </svg>
            }
            actions={
              <Link href="/catalogo">
                <Button type="button" variant="primary">
                  Explorar catálogo
                </Button>
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  // Calcular subtotal si todos los ítems tienen precio disponible y sin advertencias pendientes
  const hasIncompletePrices = items.some((it) => !it.unitPrice || Boolean(it.attention));
  const subtotal = hasIncompletePrices
    ? null
    : (cart?.subtotal !== undefined && cart.subtotal !== null
        ? cart.subtotal
        : {
            amount: items.reduce((acc, it) => acc + (it.unitPrice?.amount ?? 0) * it.quantity, 0),
            currency: items[0]?.unitPrice?.currency || 'PEN',
          });

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
          itemCount={items.reduce((acc, it) => acc + it.quantity, 0)}
        />
      </div>
    </main>
  );
}
