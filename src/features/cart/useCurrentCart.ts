'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CartSnapshot } from './types';
import { getCartApi, updateCartItemQuantityApi, removeCartItemApi } from './api';
import type { CartItemDTO } from './types';

function mergeCartWithPresentation(incomingCart: CartSnapshot, previousCart: CartSnapshot | null): CartSnapshot {
  return {
    ...incomingCart,
    items: incomingCart.items.map((newItem) => {
      const existing = previousCart?.items.find((it) => it.sku === newItem.sku);
      return {
        ...newItem,
        name: existing?.name ?? newItem.name ?? newItem.sku.replace('INKA-', '').replace(/-/g, ' '),
        imageUrl: existing?.imageUrl ?? newItem.imageUrl,
        variantName: existing?.variantName ?? newItem.variantName,
      };
    }),
  };
}

export function useCurrentCart(useMock: boolean = true) {
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const data = await getCartApi(useMock);
        if (!cancelled) {
          setCart((prev) => mergeCartWithPresentation(data, prev));
          if (!data.items || data.items.length === 0) {
            setStatus('empty');
          } else {
            setStatus('ready');
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Error al consultar el carrito.');
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [useMock, reloadKey]);

  const retry = useCallback(() => {
    setStatus('loading');
    setErrorMessage(undefined);
    setReloadKey((k) => k + 1);
  }, []);

  const handleQuantityChange = useCallback(
    async (sku: string, newQty: number) => {
      if (newQty < 1 || newQty > 99) return;
      setIsBusy(true);
      try {
        const result = await updateCartItemQuantityApi(sku, newQty, cart?.version, useMock);

        if (result.success && result.cart) {
          setCart((prev) => mergeCartWithPresentation(result.cart!, prev));
          setErrorMessage(undefined);
        } else if (result.success) {
          setCart((prev) => {
            if (!prev) return prev;
            const updatedItems = prev.items.map((it) =>
              it.sku === sku ? { ...it, quantity: newQty } : it
            );
            return {
              ...prev,
              version: prev.version + 1,
              items: updatedItems,
            };
          });
          setErrorMessage(undefined);
        } else {
          // Reconciliar tras 409 CART_CONFLICT según SPEC React §5
          if (result.status === 409 || result.code === 'CART_CONFLICT') {
            try {
              const freshSnapshot = await getCartApi(useMock);
              setCart((prev) => mergeCartWithPresentation(freshSnapshot, prev));
            } catch {
              // si falla GET, conservar el snapshot previo
            }
          }
          setErrorMessage(result.message);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar la cantidad.');
      } finally {
        setIsBusy(false);
      }
    },
    [cart, useMock]
  );

  const handleRemove = useCallback(
    async (sku: string) => {
      setIsBusy(true);
      try {
        setCart((prev) => {
          if (!prev) return prev;
          const updatedItems = prev.items.filter((it) => it.sku !== sku);
          const newCart = {
            ...prev,
            version: prev.version + 1,
            items: updatedItems,
          };
          if (updatedItems.length === 0) {
            setStatus('empty');
          }
          return newCart;
        });
      } finally {
        setIsBusy(false);
      }
    },
    []
  );

  return {
    cart,
    status,
    errorMessage,
    isBusy,
    retry,
    handleQuantityChange,
    handleRemove,
  };
}
