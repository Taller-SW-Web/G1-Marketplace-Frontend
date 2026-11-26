'use client';

import { useCallback, useState } from 'react';
import { moveCartItemToWishlistApi } from './api';
import type { MoveToWishlistResult, MoveToWishlistStatus } from './types';

export interface UseMoveCartToWishlistReturn {
  status: MoveToWishlistStatus;
  busy: boolean;
  message: string | null;
  lastResult: MoveToWishlistResult | null;
  moveItem: (sku: string, authenticated: boolean) => Promise<MoveToWishlistResult | null>;
  reset: () => void;
}

/**
 * Hook para orquestar el flujo de mover ítems a favoritos (F-021)
 * Estados: READY -> AUTH_REQUIRED | MOVING -> MOVED | ALREADY_FAVORITE | ERROR
 */
export function useMoveCartToWishlist(useMock: boolean = true): UseMoveCartToWishlistReturn {
  const [status, setStatus] = useState<MoveToWishlistStatus>('READY');
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MoveToWishlistResult | null>(null);

  const moveItem = useCallback(
    async (sku: string, authenticated: boolean): Promise<MoveToWishlistResult | null> => {
      // Regla RC-F-021-01: sin sesión no POST
      if (!authenticated) {
        setStatus('AUTH_REQUIRED');
        setMessage('Debes iniciar sesión para guardar productos en favoritos.');
        return null;
      }

      setBusy(true);
      setStatus('MOVING');
      setMessage(null);

      try {
        const result = await moveCartItemToWishlistApi(sku, useMock);
        setLastResult(result);

        if (result.wishlistCreated) {
          setStatus('MOVED');
          setMessage('Producto guardado en favoritos y retirado del carrito.');
        } else {
          // RN-F021-04: Ya estaba en favoritos, igualmente se retira del carrito
          setStatus('ALREADY_FAVORITE');
          setMessage('El producto ya estaba en tus favoritos.');
        }

        return result;
      } catch (err: unknown) {
        // Regla CA-F021-01 / RC-F-021-02: Fallo conserva la línea
        setStatus('ERROR');
        setMessage(err instanceof Error ? err.message : 'Error al mover a favoritos');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [useMock]
  );

  const reset = useCallback(() => {
    setStatus('READY');
    setBusy(false);
    setMessage(null);
    setLastResult(null);
  }, []);

  return {
    status,
    busy,
    message,
    lastResult,
    moveItem,
    reset,
  };
}

