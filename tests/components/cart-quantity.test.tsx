import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CartLine } from '../../src/features/cart/CartLine';
import { CartPageContainer } from '../../src/features/cart/CartPageContainer';
import { resetMockCart, updateCartItemQuantityApi } from '../../src/features/cart/api';
import type { CartSnapshot } from '../../src/features/cart/types';

describe('Frontend #49 (FE) & Frontend #50 (QA-F): Controles y validación de cantidad', () => {
  beforeEach(() => {
    resetMockCart();
  });

  describe('CMP-F017: CartLine controls (+ / - e input numérico)', () => {
    it('renderiza controles de incremento, decremento e input numérico con accesibilidad', () => {
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 3,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
        />
      );

      // Verificación de existencia de controles (Frontend #49)
      const decBtn = screen.getByRole('button', { name: 'Disminuir cantidad' });
      const incBtn = screen.getByRole('button', { name: 'Aumentar cantidad' });
      const input = screen.getByRole('spinbutton', { name: /Cantidad de Camiseta Inka Pro/i });

      expect(decBtn).toBeDefined();
      expect(incBtn).toBeDefined();
      expect(input).toBeDefined();
      expect((input as HTMLInputElement).value).toBe('3');
      expect((decBtn as HTMLButtonElement).disabled).toBe(false);
      expect((incBtn as HTMLButtonElement).disabled).toBe(false);
    });

    it('RC-F-017-01: límite inferior mínimo es 1; botón (-) se deshabilita cuando quantity es 1', () => {
      const onQuantityChange = vi.fn();
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 1,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onQuantityChange={onQuantityChange}
        />
      );

      const decBtn = screen.getByRole('button', { name: 'Disminuir cantidad' });
      expect((decBtn as HTMLButtonElement).disabled).toBe(true);

      // Clic en botón deshabilitado no dispara acción
      fireEvent.click(decBtn);
      expect(onQuantityChange).not.toHaveBeenCalled();
    });

    it('RC-F-017-02: botón (+) incrementa la cantidad en 1 y botón (-) decrementa en 1', () => {
      const onQuantityChange = vi.fn();
      const { rerender } = render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 2,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onQuantityChange={onQuantityChange}
        />
      );

      // Aumentar de 2 a 3
      fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 3);

      // Disminuir de 2 a 1
      fireEvent.click(screen.getByRole('button', { name: 'Disminuir cantidad' }));
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 1);

      // Cuando alcanza el límite superior (99), (+) se deshabilita
      rerender(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 99,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onQuantityChange={onQuantityChange}
        />
      );
      const incBtn = screen.getByRole('button', { name: 'Aumentar cantidad' });
      expect((incBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('RC-F-017-03: edición directa en el input numérico actualiza cantidad dentro del rango [1..99]', () => {
      const onQuantityChange = vi.fn();
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 2,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onQuantityChange={onQuantityChange}
        />
      );

      const input = screen.getByRole('spinbutton', { name: /Cantidad de Camiseta Inka Pro/i });
      fireEvent.change(input, { target: { value: '5' } });
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 5);

      // Intentar colocar 0 o menor es ignorado en el onChange de rango válido
      onQuantityChange.mockClear();
      fireEvent.change(input, { target: { value: '0' } });
      expect(onQuantityChange).not.toHaveBeenCalled();
    });

    it('bloquea controles interactivos mientras la operación esté en progreso (busy=true)', () => {
      const onQuantityChange = vi.fn();
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 2,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          busy={true}
          onQuantityChange={onQuantityChange}
        />
      );

      expect((screen.getByRole('button', { name: 'Disminuir cantidad' }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: 'Aumentar cantidad' }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('spinbutton', { name: /Cantidad de Camiseta Inka Pro/i }) as HTMLInputElement).disabled).toBe(true);
    });
  });

  describe('Integración de Carrito y Recálculo de Subtotal (F-017)', () => {
    it('muestra el subtotal recalculado cuando se pasa el snapshot actualizado', () => {
      const cartState: CartSnapshot = {
        cartId: 'MOCK-CART-001',
        version: 3,
        items: [
          {
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 4,
            unitPrice: { amount: 25.0, currency: 'PEN' },
          },
        ],
      };

      render(<CartPageContainer cart={cartState} status="ready" />);

      // Subtotal recalculado: 4 * 25.0 = S/ 100.00 PEN
      expect(screen.getByText(/S\/ 100.00 PEN/i)).toBeDefined();
    });
  });

  describe('Contrato MOCK de updateCartItemQuantityApi (F-017 / Backend #91 & #92)', () => {
    it('actualiza exitosamente la cantidad retornando 200 y versión incrementada', async () => {
      resetMockCart({
        cartId: 'CART-1',
        version: 1,
        items: [{ sku: 'SKU-TEST', name: 'Test', quantity: 1, unitPrice: { amount: 10, currency: 'PEN' } }],
      });

      const res = await updateCartItemQuantityApi('SKU-TEST', 4, 1, true);
      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
      expect(res.code).toBe('QUANTITY_UPDATED');
      expect(res.item?.quantity).toBe(4);
      expect(res.cart?.version).toBe(2);
    });

    it('rechaza con 400 INVALID_QUANTITY si quantity < 1 o > 99', async () => {
      const resUnder = await updateCartItemQuantityApi('SKU-TEST', 0, 1, true);
      expect(resUnder.success).toBe(false);
      expect(resUnder.status).toBe(400);
      expect(resUnder.code).toBe('INVALID_QUANTITY');

      const resOver = await updateCartItemQuantityApi('SKU-TEST', 100, 1, true);
      expect(resOver.success).toBe(false);
      expect(resOver.status).toBe(400);
    });

    it('responde 409 STOCK_LIMIT_REACHED y ajusta al máximo disponible cuando supera el stock', async () => {
      resetMockCart({
        cartId: 'CART-1',
        version: 1,
        items: [{ sku: 'SKU-LIMITED', name: 'Limited Item', quantity: 1, unitPrice: { amount: 10, currency: 'PEN' } }],
      });

      // SKU-LIMITED tiene un límite de 3
      const res = await updateCartItemQuantityApi('SKU-LIMITED', 8, 1, true);
      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('STOCK_LIMIT_REACHED');
      expect(res.item?.quantity).toBe(3); // Ajustado al stock máximo
    });

    it('responde 409 CART_CONFLICT si la versión esperada no coincide con el carrito', async () => {
      resetMockCart({
        cartId: 'CART-1',
        version: 5,
        items: [{ sku: 'SKU-TEST', name: 'Test', quantity: 1, unitPrice: { amount: 10, currency: 'PEN' } }],
      });

      const res = await updateCartItemQuantityApi('SKU-TEST', 2, 2, true); // Versión esperada 2 vs actual 5
      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('CART_CONFLICT');
    });
  });
});
