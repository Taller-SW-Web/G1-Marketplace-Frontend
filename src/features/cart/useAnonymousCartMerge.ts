'use client';

import { useCallback, useState } from 'react';
import { mergeAnonymousCartApi } from './api';
import type { CartMergeResult, MergeAdjustment, MergeStatus } from './types';

export interface UseAnonymousCartMergeReturn {
  status: MergeStatus;
  adjustments: MergeAdjustment[];
  result: CartMergeResult | null;
  busy: boolean;
  executeMerge: () => Promise<CartMergeResult | null>;
  continueWithoutMerge: () => void;
  reset: () => void;
}

export function useAnonymousCartMerge(useMock: boolean = true): UseAnonymousCartMergeReturn {
  const [status, setStatus] = useState<MergeStatus>('IDLE');
  const [adjustments, setAdjustments] = useState<MergeAdjustment[]>([]);
  const [result, setResult] = useState<CartMergeResult | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const executeMerge = useCallback(async (): Promise<CartMergeResult | null> => {
    setBusy(true);
    setStatus('MERGING');

    try {
      const res = await mergeAnonymousCartApi(useMock);
      setResult(res);
      setAdjustments(res.adjustments || []);

      if (res.merged) {
        setStatus('MERGED');
      } else {
        setStatus('NO_SOURCE');
      }
      return res;
    } catch {
      setStatus('FAILED');
      return null;
    } finally {
      setBusy(false);
    }
  }, [useMock]);

  const continueWithoutMerge = useCallback(() => {
    setStatus('DEFERRED');
  }, []);

  const reset = useCallback(() => {
    setStatus('IDLE');
    setAdjustments([]);
    setResult(null);
    setBusy(false);
  }, []);

  return {
    status,
    adjustments,
    result,
    busy,
    executeMerge,
    continueWithoutMerge,
    reset,
  };
}

