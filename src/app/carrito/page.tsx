'use client';

import { useRouter } from 'next/navigation';
import { CartPageContainer } from '@/features/cart/CartPageContainer';
import { useCurrentCart } from '@/features/cart/useCurrentCart';

export default function CarritoPage() {
  const router = useRouter();
  const { cart, status, errorMessage, isBusy, retry, handleQuantityChange, handleRemove } =
    useCurrentCart(false);

  const handleCheckout = () => {
    if (cart) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('checkout_cart_id', cart.cartId || '');
        sessionStorage.setItem('checkout_cart_version', String(cart.version || 1));
      }
      router.push(
        `/checkout?cartId=${encodeURIComponent(cart.cartId || '')}&version=${cart.version || 1}`
      );
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div style={{ padding: '32px 16px', minHeight: '60vh', maxWidth: '1000px', margin: '0 auto' }}>
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
