'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAnonymousCartMerge } from './useAnonymousCartMerge';
import { MergeFailureNotice } from './MergeFailureNotice';
import { MergeAdjustmentsDialog } from './MergeAdjustmentsDialog';
import type { CartMergeCoordinatorProps } from './types';

/**
 * CMP-F020-001: CartMergeCoordinator
 * Orquesta la fusión del carrito anónimo con el del usuario titular tras completar
 * el inicio de sesión (G7) y valida las reglas RC-F-020-01 a RC-F-020-04.
 */
export const CartMergeCoordinator: React.FC<CartMergeCoordinatorProps> = ({
  sessionReady,
  onMerged,
  onFailed,
}) => {
  const {
    status,
    adjustments,
    busy,
    executeMerge,
    continueWithoutMerge,
  } = useAnonymousCartMerge(true);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const executedRef = useRef<boolean>(false);

  // Regla RC-F-020-02: MFA incompleto o sesión no lista no dispara la fusión
  useEffect(() => {
    if (!sessionReady || executedRef.current) return;
    executedRef.current = true;

    executeMerge().then((res) => {
      if (res?.merged) {
        onMerged?.(res);
        if (res.adjustments && res.adjustments.length > 0) {
          setDialogOpen(true);
        }
      } else if (res && !res.merged) {
        // No había carrito anónimo (merged: false)
        onMerged?.(res);
      } else {
        onFailed?.();
      }
    });
  }, [sessionReady, executeMerge, onMerged, onFailed]);

  // Si el usuario eligió diferir la fusión (RC-F-020-03)
  if (status === 'DEFERRED') {
    return null;
  }

  return (
    <div className="cart-merge-coordinator my-4">
      {status === 'MERGING' && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600"
        >
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span>Sincronizando los productos de tu carrito…</span>
        </div>
      )}

      {status === 'FAILED' && (
        <MergeFailureNotice
          busy={busy}
          canRetry={true}
          onRetry={async () => {
            const res = await executeMerge();
            if (res?.merged) {
              onMerged?.(res);
            } else if (!res) {
              onFailed?.();
            }
          }}
          onContinueWithoutMerge={() => {
            continueWithoutMerge();
            onFailed?.();
          }}
        />
      )}

      <MergeAdjustmentsDialog
        adjustments={adjustments}
        opened={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onViewCart={() => {
          setDialogOpen(false);
          if (typeof window !== 'undefined') {
            window.location.href = '/carrito';
          }
        }}
      />
    </div>
  );
};
