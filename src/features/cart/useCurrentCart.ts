'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CartSnapshot } from './types';
import { getCartApi } from './api';

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
          setCart(data);
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
      if (newQty < 1) return;
      setIsBusy(true);
      try {
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
      } finally {
        setIsBusy(false);
      }
    },
    []
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
