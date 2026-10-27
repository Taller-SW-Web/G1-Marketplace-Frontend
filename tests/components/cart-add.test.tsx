import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddToCartAction } from '../../src/features/cart/AddToCartAction';
import { AddedToCartFeedback } from '../../src/features/cart/AddedToCartFeedback';
import { resetMockCart, addCartItemApi } from '../../src/features/cart/api';
import type { CartMutationResult } from '../../src/features/cart/types';

describe('TASK-F016-FE-001 / CMP-F016-001: AddToCartAction', () => {
  it('permite agregar 1 unidad cuando el producto tiene stock y precio listo', () => {
    const onAdd = vi.fn();
    render(
      <AddToCartAction
        productId="INKA-PRO-M"
        availability="AVAILABLE"
        priceReady={true}
        busy={false}
        onAdd={onAdd}
      />
    );

    const button = screen.getByRole('button', { name: 'Agregar al carrito' });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({ productId: 'INKA-PRO-M', quantity: 1 });
  });

  it('RC-F-016-01: bloquea doble clic y muestra estado busy durante el envío', () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <AddToCartAction
        productId="INKA-PRO-M"
        availability="AVAILABLE"
        priceReady={true}
        busy={true}
        onAdd={onAdd}
      />
    );

    const button = screen.getByRole('button', { name: /Agregando al carrito/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    // Doble pulsación no debe disparar onAdd
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();

    // Al desocuparse, vuelve a ser interactivo
    rerender(
      <AddToCartAction
        productId="INKA-PRO-M"
        availability="AVAILABLE"
        priceReady={true}
        busy={false}
        onAdd={onAdd}
      />
    );
    const readyButton = screen.getByRole('button', { name: 'Agregar al carrito' });
    fireEvent.click(readyButton);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('muestra ayuda accesible y deshabilita si falta seleccionar variante (UNSELECTED)', () => {
    const onAdd = vi.fn();
    render(
      <AddToCartAction
        productId={undefined}
        availability="UNSELECTED"
        priceReady={true}
        busy={false}
        onAdd={onAdd}
      />
    );

    const button = screen.getByRole('button', { name: 'Agregar al carrito' });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    const hint = screen.getByRole('status');
    expect(hint.textContent).toContain('Selecciona una talla o variante');
  });

  it('deshabilita con aviso si el producto está agotado (UNAVAILABLE) y permite reintentar', () => {
    const onAdd = vi.fn();
    const onRetry = vi.fn();
    render(
      <AddToCartAction
        productId="INKA-PRO-XL"
        availability="UNAVAILABLE"
        priceReady={true}
        busy={false}
        onAdd={onAdd}
        onRetryAvailability={onRetry}
      />
    );

    const button = screen.getByRole('button', { name: 'Agregar al carrito' });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('actualmente agotado');

    const retryBtn = screen.getByRole('button', { name: 'Reintentar disponibilidad' });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('TASK-F016-FE-001 / CMP-F016-002: AddedToCartFeedback (Overlay O-005)', () => {
  it('renderiza confirmación de nueva línea agregada (201 ITEM_CREATED)', () => {
    const result: CartMutationResult = {
      success: true,
      status: 201,
      code: 'ITEM_CREATED',
      message: 'Producto agregado al carrito.',
      item: {
        sku: 'INKA-PRO-M',
        name: 'Camiseta Deportiva Inka Pro',
        quantity: 1,
      },
    };

    render(
      <AddedToCartFeedback
        result={result}
        opened={true}
        onViewCart={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText('Producto agregado al carrito')).toBeDefined();
    expect(screen.getByText('Camiseta Deportiva Inka Pro')).toBeDefined();
    expect(screen.getByText(/Agregaste 1 unidad a tu carrito/i)).toBeDefined();
  });

  it('renderiza confirmación de cantidad incrementada (200 ITEM_INCREMENTED)', () => {
    const result: CartMutationResult = {
      success: true,
      status: 200,
      code: 'ITEM_INCREMENTED',
      message: 'Producto incrementado.',
      item: {
        sku: 'INKA-PRO-M',
        name: 'Camiseta Deportiva Inka Pro',
        quantity: 2,
      },
    };

    render(
      <AddedToCartFeedback
        result={result}
        opened={true}
        onViewCart={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText('Producto agregado al carrito')).toBeDefined();
    expect(screen.getByText(/Cantidad total confirmada en tu carrito: 2/i)).toBeDefined();
  });

  it('RC-F-016-03: renderiza aviso de cantidad ajustada por límite de stock (409 STOCK_LIMIT_REACHED)', () => {
    const result: CartMutationResult = {
      success: true,
      status: 409,
      code: 'STOCK_LIMIT_REACHED',
      message: 'Ajustamos la cantidad al máximo disponible (3 unidades).',
      item: {
        sku: 'INKA-PRO-M',
        name: 'Camiseta Deportiva Inka Pro',
        quantity: 3,
      },
    };

    render(
      <AddedToCartFeedback
        result={result}
        opened={true}
        onViewCart={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Ajustamos la cantidad disponible en tu carrito')).toBeDefined();
    expect(screen.getByText(/Ajustamos la cantidad al máximo disponible/i)).toBeDefined();
  });

  it('UI-O005-004: NO muestra subtotales ni total final de checkout', () => {
    const result: CartMutationResult = {
      success: true,
      status: 200,
      code: 'ITEM_INCREMENTED',
      message: 'OK',
      item: {
        sku: 'INKA-PRO-M',
        name: 'Camiseta Inka Pro',
        quantity: 2,
        unitPrice: { amount: 100, currency: 'PEN' },
      },
    };

    const { container } = render(
      <AddedToCartFeedback
        result={result}
        opened={true}
        onViewCart={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(container.textContent).not.toContain('Subtotal');
    expect(container.textContent).not.toContain('Total:');
    expect(container.textContent).not.toContain('Checkout');
  });

  it('dispara onViewCart y onContinue según interacción del usuario', () => {
    const onViewCart = vi.fn();
    const onContinue = vi.fn();

    const result: CartMutationResult = {
      success: true,
      status: 201,
      code: 'ITEM_CREATED',
      message: 'OK',
    };

    render(
      <AddedToCartFeedback
        result={result}
        opened={true}
        onViewCart={onViewCart}
        onContinue={onContinue}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver carrito' }));
    expect(onViewCart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Seguir comprando' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('MOCK Cart API (Hito 3 / Semana 8)', () => {
  beforeEach(() => {
    resetMockCart();
  });

  it('crea línea (201) en primera adición e incrementa (200) en segunda adición', async () => {
    const res1 = await addCartItemApi({ sku: 'INKA-01', quantity: 1 }, true);
    expect(res1.status).toBe(201);
    expect(res1.code).toBe('ITEM_CREATED');
    expect(res1.item?.quantity).toBe(1);

    const res2 = await addCartItemApi({ sku: 'INKA-01', quantity: 1 }, true);
    expect(res2.status).toBe(200);
    expect(res2.code).toBe('ITEM_INCREMENTED');
    expect(res2.item?.quantity).toBe(2);
  });

  it('rechaza con 404 SKU_NOT_AVAILABLE si el producto no es elegible/sin stock (caso negativo QA)', async () => {
    const res = await addCartItemApi({ sku: 'SKU-UNAVAILABLE', quantity: 1 }, true);
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
    expect(res.code).toBe('SKU_NOT_AVAILABLE');
  });

  it('envía productId al Backend para que el SKU MOCK se resuelva en el servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { cartId: 'cart-1', version: 1, items: [{ sku: 'SKU-MOCK-001', quantity: 1 }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await addCartItemApi({ productId: 'PRD-MOCK-001', quantity: 1 }, false);

    expect(fetchMock).toHaveBeenCalledWith('/api/cart/current/items', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ productId: 'PRD-MOCK-001', quantity: 1 }),
    }));
    expect(result.status).toBe(201);
    vi.unstubAllGlobals();
  });
});
