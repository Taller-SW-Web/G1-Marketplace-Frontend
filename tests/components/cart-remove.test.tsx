import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { CartLine } from '../../src/features/cart/CartLine';
import { UndoRemovalFeedback } from '../../src/features/cart/UndoRemovalFeedback';
import { removeCartItemApi, resetMockCart } from '../../src/features/cart/api';

describe('TASK-F018-FE-001 / TASK-F018-QA-001: Quitar ítem del carrito y Deshacer (F-018 & O-006)', () => {
  beforeEach(() => {
    resetMockCart({
      cartId: 'MOCK-CART-001',
      version: 1,
      items: [
        {
          sku: 'INKA-PRO-M',
          name: 'Camiseta Inka Pro',
          quantity: 2,
          unitPrice: { amount: 50.0, currency: 'PEN' },
        },
        {
          sku: 'ZAP-AERO-42',
          name: 'Zapatillas Aero',
          quantity: 1,
          unitPrice: { amount: 120.0, currency: 'PEN' },
        },
      ],
    });
    vi.restoreAllMocks();
  });

  describe('CMP-F018-001 · RemoveCartItemAction en CartLine', () => {
    it('renderiza botón eliminar con nombre accesible y aria-label descriptivo (RC-F-018-01 / DS-001)', () => {
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 2,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onRemove={vi.fn()}
        />
      );

      const removeBtn = screen.getByRole('button', { name: /Quitar Camiseta Inka Pro del carrito/i });
      expect(removeBtn).toBeDefined();
      expect((removeBtn as HTMLButtonElement).disabled).toBe(false);
    });

    it('invoca onRemove con el SKU exacto al hacer click', () => {
      const onRemove = vi.fn();
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 2,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          onRemove={onRemove}
        />
      );

      const removeBtn = screen.getByRole('button', { name: /Quitar Camiseta Inka Pro del carrito/i });
      fireEvent.click(removeBtn);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith('INKA-PRO-M');
    });

    it('deshabilita el botón de eliminar cuando busy es true (evita dobles mutaciones)', () => {
      const onRemove = vi.fn();
      render(
        <CartLine
          line={{
            sku: 'INKA-PRO-M',
            name: 'Camiseta Inka Pro',
            quantity: 2,
            unitPrice: { amount: 50.0, currency: 'PEN' },
          }}
          busy={true}
          onRemove={onRemove}
        />
      );

      const removeBtn = screen.getByRole('button', { name: /Quitar Camiseta Inka Pro del carrito/i });
      expect((removeBtn as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(removeBtn);
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('CMP-F018-002 · UndoRemovalFeedback (Overlay O-006)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('muestra el mensaje contextual accesible con role="status" y aria-live="polite"', () => {
      render(
        <UndoRemovalFeedback
          label="Camiseta Inka Pro"
          onUndo={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const toast = screen.getByRole('status');
      expect(toast).toBeDefined();
      expect(toast.getAttribute('aria-live')).toBe('polite');
      expect(toast.textContent).toContain('Quitaste Camiseta Inka Pro del carrito.');
    });

    it('permite accionar "Deshacer" e invoca onUndo', () => {
      const onUndo = vi.fn();
      render(
        <UndoRemovalFeedback
          label="Camiseta Inka Pro"
          onUndo={onUndo}
          onDismiss={vi.fn()}
        />
      );

      const undoBtn = screen.getByRole('button', { name: /Deshacer eliminación de Camiseta Inka Pro/i });
      expect(undoBtn).toBeDefined();
      fireEvent.click(undoBtn);

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('permite cerrar la notificación manualmente con el botón de descarte', () => {
      const onDismiss = vi.fn();
      render(
        <UndoRemovalFeedback
          label="Camiseta Inka Pro"
          onUndo={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      const dismissBtn = screen.getByRole('button', { name: /Cerrar notificación de eliminación/i });
      fireEvent.click(dismissBtn);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('expira automáticamente y llama a onDismiss tras la ventana de 5 segundos', () => {
      const onDismiss = vi.fn();
      render(
        <UndoRemovalFeedback
          label="Camiseta Inka Pro"
          remainingSeconds={5}
          onUndo={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('pausa el temporizador accesible en hover (onMouseEnter / onMouseLeave)', () => {
      const onDismiss = vi.fn();
      render(
        <UndoRemovalFeedback
          label="Camiseta Inka Pro"
          remainingSeconds={5}
          onUndo={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      const toast = screen.getByRole('status');

      // Avanzar 2 segundos
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Mouse entra -> pausa
      fireEvent.mouseEnter(toast);

      // Pasan 10 segundos en pausa
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Mouse sale -> reanuda
      fireEvent.mouseLeave(toast);

      // Pasan los 3 segundos restantes
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('pausa el temporizador cuando el botón Deshacer recibe foco de teclado (onFocus / onBlur)', () => {
      const onDismiss = vi.fn();
      render(
        <UndoRemovalFeedback
          label="Camiseta Inka Pro"
          remainingSeconds={5}
          onUndo={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      const toast = screen.getByRole('status');

      // Foco entra
      fireEvent.focus(toast);

      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Foco sale
      fireEvent.blur(toast);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeCartItemApi (Cliente API & Idempotencia)', () => {
    it('rechaza SKU vacío con 400 SKU_NOT_AVAILABLE', async () => {
      const res = await removeCartItemApi('   ', 1, true);
      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.code).toBe('SKU_NOT_AVAILABLE');
    });

    it('elimina ítem existente e incrementa Cart.version (RN-F018-01)', async () => {
      const res = await removeCartItemApi('INKA-PRO-M', 1, true);
      expect(res.success).toBe(true);
      expect(res.code).toBe('ITEM_REMOVED');
      expect(res.cart?.items.length).toBe(1);
      expect(res.cart?.items[0].sku).toBe('ZAP-AERO-42');
      expect(res.cart?.version).toBe(2);
    });

    it('es idempotente: eliminar un ítem inexistente no falla (RN-F018-03)', async () => {
      const res = await removeCartItemApi('SKU-INEXISTENTE', 1, true);
      expect(res.success).toBe(true);
      expect(res.code).toBe('ITEM_REMOVED');
      expect(res.cart?.items.length).toBe(2);
    });

    it('rechaza con 409 CART_CONFLICT si expectedVersion no coincide', async () => {
      const res = await removeCartItemApi('INKA-PRO-M', 99, true);
      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.code).toBe('CART_CONFLICT');
    });
  });
});

