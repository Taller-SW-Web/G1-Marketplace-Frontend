import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import { CartLine } from '../../src/features/cart/CartLine';
import { CartPageContainer } from '../../src/features/cart/CartPageContainer';
import { resetMockCart, updateCartItemQuantityApi } from '../../src/features/cart/api';
import { useCurrentCart } from '../../src/features/cart/useCurrentCart';
import type { CartSnapshot } from '../../src/features/cart/types';

describe('Frontend #49 (FE) & Frontend #50 (QA-F): Controles y validación de cantidad F-017', () => {
  beforeEach(() => {
    resetMockCart();
    vi.restoreAllMocks();
  });

  describe('CMP-F017-001 / QuantityStepper: Edición con borrador local (draft) y confirmación', () => {
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

      fireEvent.click(decBtn);
      expect(onQuantityChange).not.toHaveBeenCalled();
    });

    it('RC-F-017-02: botón (+) incrementa en 1 y botón (-) decrementa en 1 de forma inmediata', () => {
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

      fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 3);

      fireEvent.click(screen.getByRole('button', { name: 'Disminuir cantidad' }));
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 1);

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

    it('SPEC React §4: escribir "15" mantiene draft local y produce UNA SOLA mutación al confirmar con blur o Enter', () => {
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

      // Durante la escritura el draft cambia localmente, pero NO se emite mutación
      fireEvent.change(input, { target: { value: '1' } });
      fireEvent.change(input, { target: { value: '15' } });
      expect(onQuantityChange).not.toHaveBeenCalled();

      // Al perder el foco (blur), se confirma y emite una sola mutación
      fireEvent.blur(input);
      expect(onQuantityChange).toHaveBeenCalledTimes(1);
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 15);

      // Confirmar con Enter también funciona
      onQuantityChange.mockClear();
      fireEvent.change(input, { target: { value: '8' } });
      expect(onQuantityChange).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onQuantityChange).toHaveBeenCalledTimes(1);
      expect(onQuantityChange).toHaveBeenCalledWith('INKA-PRO-M', 8);
    });

    it('SPEC React §4: escribir decimal "1.5" NO se trunca a 1 ni se envía; restaura la cantidad confirmada', () => {
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
      fireEvent.change(input, { target: { value: '1.5' } });
      fireEvent.blur(input);

      // No se envía y se restaura a 2
      expect(onQuantityChange).not.toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe('2');
    });

    it('SPEC React §4: escribir "0" o valores negativos/mayores a 99 no envía y restaura valor confirmado', () => {
      const onQuantityChange = vi.fn();
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 3,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onQuantityChange={onQuantityChange}
        />
      );

      const input = screen.getByRole('spinbutton', { name: /Cantidad de Camiseta Inka Pro/i });
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);
      expect(onQuantityChange).not.toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe('3');

      fireEvent.change(input, { target: { value: '120' } });
      fireEvent.blur(input);
      expect(onQuantityChange).not.toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe('3');
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

  describe('Integración de Carrito, Subtotal y Preservación de Presentación', () => {
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
      expect(screen.getByText(/S\/ 100.00 PEN/i)).toBeDefined();
    });

    it('SPEC React §5: hook useCurrentCart conserva el nombre y metadata de presentación al sustituir el snapshot', async () => {
      resetMockCart({
        cartId: 'CART-PRESERVE',
        version: 1,
        items: [
          {
            sku: 'INKA-ZAP-01',
            name: 'Zapatillas Running Pro',
            quantity: 1,
            unitPrice: { amount: 150.0, currency: 'PEN' },
          },
        ],
      });

      function TestCartConsumer() {
        const { cart, handleQuantityChange } = useCurrentCart(true);
        return (
          <div>
            <span data-testid="item-name">{cart?.items[0]?.name}</span>
            <span data-testid="item-qty">{cart?.items[0]?.quantity}</span>
            <button onClick={() => handleQuantityChange('INKA-ZAP-01', 3)}>Cambiar a 3</button>
          </div>
        );
      }

      render(<TestCartConsumer />);

      // Al cambiar la cantidad, el nombre no se degrada a SKU
      const btn = await screen.findByRole('button', { name: 'Cambiar a 3' });
      await act(async () => {
        fireEvent.click(btn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('item-name').textContent).toBe('Zapatillas Running Pro');
        expect(screen.getByTestId('item-qty').textContent).toBe('3');
      });
    });
  });

  describe('SPEC React §5 & §6: Alineación de errores de backend y reconciliación de conflictos', () => {
    it('alinea formato de error cuando el backend devuelve "code" en la raíz (NestJS)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          code: 'CART_CONFLICT',
          message: 'Conflicto de versión en carrito',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateCartItemQuantityApi('INKA-PRO-M', 2, 1, false);
      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('CART_CONFLICT');
      expect(res.message).toBe('Conflicto de versión en carrito');
    });

    it('alinea formato de error cuando el backend devuelve error anidado { error: { code, message } }', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_QUANTITY',
            message: 'La cantidad debe ser un entero entre 1 y 99.',
          },
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateCartItemQuantityApi('INKA-PRO-M', 0, 1, false);
      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.code).toBe('INVALID_QUANTITY');
    });

    it('fixture MOCK sintético local reporta STOCK_LIMIT_REACHED (sin invocar G6)', async () => {
      resetMockCart({
        cartId: 'CART-1',
        version: 1,
        items: [{ sku: 'SKU-LIMITED', name: 'Limited Item', quantity: 1, unitPrice: { amount: 10, currency: 'PEN' } }],
      });

      const res = await updateCartItemQuantityApi('SKU-LIMITED', 8, 1, true);
      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('STOCK_LIMIT_REACHED');
      expect(res.item?.quantity).toBe(3);
    });

    it('responde 409 CART_CONFLICT si la versión esperada no coincide con el carrito MOCK', async () => {
      resetMockCart({
        cartId: 'CART-1',
        version: 5,
        items: [{ sku: 'SKU-TEST', name: 'Test', quantity: 1, unitPrice: { amount: 10, currency: 'PEN' } }],
      });

      const res = await updateCartItemQuantityApi('SKU-TEST', 2, 2, true);
      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('CART_CONFLICT');
    });
  });
});
