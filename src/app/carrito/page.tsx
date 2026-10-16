'use client';

import { CartPageContainer } from '@/features/cart/CartPageContainer';
import { useCurrentCart } from '@/features/cart/useCurrentCart';

export default function CarritoPage() {
  const { cart, status, errorMessage, isBusy, retry, handleQuantityChange, handleRemove } =
    useCurrentCart(true);

  const handleCheckout = () => {
    alert('Simulación MOCK (Hito 3): Redireccionando al flujo de Checkout (F-022)...');
  };

  return (
    <div style={{ padding: '32px 16px', minHeight: '60vh' }}>
      <CartPageContainer
        cart={cart}
        status={status}
        errorMessage={errorMessage}
        onRetry={retry}
        onCheckout={handleCheckout}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemove}
        isBusy={isBusy}
      />
    </div>
  );
}
