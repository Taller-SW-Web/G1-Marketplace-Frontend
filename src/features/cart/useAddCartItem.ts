'use client';

import { useState, useCallback, useRef } from 'react';
import type { AddCartFlowState, AddToCartPayload, CartMutationResult } from './types';
import { addCartItemApi } from './api';

export interface UseAddCartItemOptions {
  useMock?: boolean;
  onSuccess?: (result: CartMutationResult) => void;
  onError?: (result: CartMutationResult) => void;
}

export function useAddCartItem(options: UseAddCartItemOptions = {}) {
  const { useMock = true, onSuccess, onError } = options;

  const [state, setState] = useState<AddCartFlowState>('READY');
  const [lastResult, setLastResult] = useState<CartMutationResult | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Candado para prevenir llamadas concurrentes / doble clic (RC-F-016-01)
  const isBusyRef = useRef(false);

  const addItem = useCallback(
    async (payload: AddToCartPayload) => {
      if (isBusyRef.current) {
        // Bloquear doble click
        return;
      }

      isBusyRef.current = true;
      setState('ADDING');

      try {
        const result = await addCartItemApi(payload, useMock);
        setLastResult(result);

        if (result.success) {
          if (result.status === 409 || result.code === 'STOCK_LIMIT_REACHED') {
            setState('ADJUSTED');
          } else {
            setState('ADDED');
          }
          setFeedbackOpen(true);
          onSuccess?.(result);
        } else {
          setState('ERROR');
          setFeedbackOpen(false);
          onError?.(result);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado al conectar con el servidor.';
        const errorResult: CartMutationResult = {
          success: false,
          status: 503,
          code: 'COMMERCE_DATA_UNAVAILABLE',
          message,
        };
        setLastResult(errorResult);
        setState('ERROR');
        onError?.(errorResult);
      } finally {
        isBusyRef.current = false;
      }
    },
    [useMock, onSuccess, onError]
  );

  const closeFeedback = useCallback(() => {
    setFeedbackOpen(false);
  }, []);

  const reset = useCallback(() => {
    setState('READY');
    setLastResult(null);
    setFeedbackOpen(false);
    isBusyRef.current = false;
  }, []);

  return {
    state,
    isBusy: state === 'ADDING',
    lastResult,
    feedbackOpen,
    addItem,
    closeFeedback,
    reset,
  };
}
