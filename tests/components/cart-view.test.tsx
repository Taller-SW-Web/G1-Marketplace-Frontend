import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CartPageContainer } from '../../src/features/cart/CartPageContainer';
import { CartSubtotal } from '../../src/features/cart/CartSubtotal';
import { CartLine } from '../../src/features/cart/CartLine';
import type { CartSnapshot } from '../../src/features/cart/types';

describe('TASK-F019-FE-001 / CMP-F019-001: CartPageContainer', () => {
  it('RC-F-019-01: carrito vacío NO renderiza resumen ni CTA de checkout', () => {
    const emptyCart: CartSnapshot = {
      cartId: 'MOCK-1',
      version: 1,
      items: [],
    };

    render(
      <CartPageContainer
        cart={emptyCart}
        status="empty"
      />
    );

    // Debe mostrar EmptyState con título y acción de explorar
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Tu carrito está vacío');
    expect(screen.getByRole('button', { name: 'Explorar catálogo' })).toBeDefined();

    // REGLA RC-F-019-01: No debe existir el resumen ni el botón de checkout
    expect(screen.queryByText('Resumen de tu pedido')).toBe(null);
    expect(screen.queryByRole('button', { name: /Iniciar Checkout/i })).toBe(null);
  });

  it('renderiza productos y resumen cuando el carrito contiene ítems', () => {
    const cartWithItems: CartSnapshot = {
      cartId: 'MOCK-1',
      version: 2,
      items: [
        {
          sku: 'INKA-PRO-M',
          name: 'Camiseta Deportiva Inka Pro',
          quantity: 2,
          unitPrice: { amount: 50.0, currency: 'PEN' },
        },
      ],
    };

    render(
      <CartPageContainer
        cart={cartWithItems}
        status="ready"
      />
    );

    expect(screen.getByText('Camiseta Deportiva Inka Pro')).toBeDefined();
    expect(screen.getByText('Resumen de tu pedido')).toBeDefined();
    // Subtotal: 2 x 50 = S/ 100.00
    expect(screen.getByText(/S\/ 100.00 PEN/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Iniciar Checkout' })).toBeDefined();
  });
});

describe('TASK-F019-FE-001 / CMP-F019-003: CartSubtotal', () => {
  it('RC-F-019-02: subtotal nulo no es gratuito ni permite checkout', () => {
    const onCheckout = vi.fn();
    render(
      <CartSubtotal
        subtotal={null}
        canCheckout={false}
        onCheckout={onCheckout}
      />
    );

    // No debe decir S/ 0.00 ni Gratis
    expect(screen.getByText(/Calculando importe…/i)).toBeDefined();
    expect(screen.queryByText(/S\/ 0\.00/i)).toBe(null);

    // Botón de checkout debe estar deshabilitado
    const checkoutBtn = screen.getByRole('button', { name: 'Iniciar Checkout' });
    expect((checkoutBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(checkoutBtn);
    expect(onCheckout).not.toHaveBeenCalled();
  });

  it('permite iniciar checkout cuando el subtotal es válido', () => {
    const onCheckout = vi.fn();
    render(
      <CartSubtotal
        subtotal={{ amount: 150.0, currency: 'PEN' }}
        canCheckout={true}
        onCheckout={onCheckout}
      />
    );

    const checkoutBtn = screen.getByRole('button', { name: 'Iniciar Checkout' });
    expect((checkoutBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(checkoutBtn);
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });
});

describe('TASK-F019-FE-001 / CMP-F019-002: CartLine', () => {
  it('dispara cambios de cantidad y eliminación', () => {
    const onQuantityChange = vi.fn();
    const onRemove = vi.fn();

    render(
      <CartLine
        line={{
          sku: 'INKA-PRO-M',
          name: 'Camiseta Inka',
          quantity: 2,
          unitPrice: { amount: 60, currency: 'PEN' },
        }}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
      />
    );

    // Aumentar cantidad (+)
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 3);

    // Disminuir cantidad (-)
    fireEvent.click(screen.getByRole('button', { name: 'Disminuir cantidad' }));
    expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 1);

    // Eliminar ítem
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onRemove).toHaveBeenCalledWith('INKA-PRO-M');
  });
});
