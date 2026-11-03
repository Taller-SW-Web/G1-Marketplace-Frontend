import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import React from 'react';
import { MoveCartToWishlistAction } from '@/features/cart/MoveCartToWishlistAction';
import { useMoveCartToWishlist } from '@/features/cart/useMoveCartToWishlist';
import * as cartApi from '@/features/cart/api';

describe('MoveCartToWishlistAction & useMoveCartToWishlist (F-021)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('MoveCartToWishlistAction (CMP-F021-001)', () => {
    it('RC-F-021-01: sin sesión no POST - triggers onRequireAuth and does not call onMove', () => {
      const onMove = vi.fn();
      const onRequireAuth = vi.fn();

      render(
        <MoveCartToWishlistAction
          sku="INKA-PRO-M"
          authenticated={false}
          onMove={onMove}
          onRequireAuth={onRequireAuth}
        />
      );

      const button = screen.getByRole('button', { name: /Guardar producto INKA-PRO-M en favoritos/i });
      fireEvent.click(button);

      expect(onRequireAuth).toHaveBeenCalledWith('/carrito');
      expect(onMove).not.toHaveBeenCalled();
    });

    it('triggers onMove when authenticated', async () => {
      const onMove = vi.fn();
      const onRequireAuth = vi.fn();

      render(
        <MoveCartToWishlistAction
          sku="INKA-PRO-M"
          authenticated={true}
          onMove={onMove}
          onRequireAuth={onRequireAuth}
        />
      );

      const button = screen.getByRole('button', { name: /Guardar producto INKA-PRO-M en favoritos/i });
      fireEvent.click(button);

      expect(onMove).toHaveBeenCalledWith('INKA-PRO-M');
      expect(onRequireAuth).not.toHaveBeenCalled();
    });

    it('disables button and displays loading text when busy is true', () => {
      render(
        <MoveCartToWishlistAction
          sku="INKA-PRO-M"
          authenticated={true}
          busy={true}
        />
      );

      const button = screen.getByRole('button', { name: /Guardar producto INKA-PRO-M en favoritos/i });
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.textContent).toContain('Guardando…');
    });
  });

  describe('useMoveCartToWishlist hook', () => {
    it('RC-F-021-01: returns AUTH_REQUIRED status when authenticated is false', async () => {
      const apiSpy = vi.spyOn(cartApi, 'moveCartItemToWishlistApi');
      const { result } = renderHook(() => useMoveCartToWishlist(true));

      await act(async () => {
        const res = await result.current.moveItem('INKA-PRO-M', false);
        expect(res).toBeNull();
      });

      expect(result.current.status).toBe('AUTH_REQUIRED');
      expect(result.current.message).toMatch(/iniciar sesión/i);
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('RC-F-021-04: successfully moves item and sets status to MOVED when wishlistCreated is true', async () => {
      vi.spyOn(cartApi, 'moveCartItemToWishlistApi').mockResolvedValueOnce({
        cartId: 'CART-100',
        version: 3,
        productId: 'PRD-100',
        wishlistCreated: true,
      });

      const { result } = renderHook(() => useMoveCartToWishlist(false));

      await act(async () => {
        const res = await result.current.moveItem('INKA-PRO-M', true);
        expect(res?.wishlistCreated).toBe(true);
        expect(res?.version).toBe(3);
      });

      expect(result.current.status).toBe('MOVED');
      expect(result.current.message).toMatch(/guardado en favoritos/i);
    });

    it('RC-F-021-03: sets status to ALREADY_FAVORITE when wishlistCreated is false', async () => {
      vi.spyOn(cartApi, 'moveCartItemToWishlistApi').mockResolvedValueOnce({
        cartId: 'CART-100',
        version: 4,
        productId: 'PRD-100',
        wishlistCreated: false,
      });

      const { result } = renderHook(() => useMoveCartToWishlist(false));

      await act(async () => {
        const res = await result.current.moveItem('INKA-PRO-M', true);
        expect(res?.wishlistCreated).toBe(false);
      });

      expect(result.current.status).toBe('ALREADY_FAVORITE');
      expect(result.current.message).toMatch(/ya estaba en tus favoritos/i);
    });

    it('RC-F-021-02: sets status to ERROR when api call fails, preserving the line', async () => {
      vi.spyOn(cartApi, 'moveCartItemToWishlistApi').mockRejectedValueOnce(
        new Error('Network failure')
      );

      const { result } = renderHook(() => useMoveCartToWishlist(false));

      await act(async () => {
        const res = await result.current.moveItem('INKA-PRO-M', true);
        expect(res).toBeNull();
      });

      expect(result.current.status).toBe('ERROR');
      expect(result.current.message).toBe('Network failure');
    });
  });
});
