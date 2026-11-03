'use client';

import React from 'react';
import type { MergeFailureNoticeProps } from './types';

/**
 * CMP-F020-002: MergeFailureNotice
 * Aviso ante fallo de fusión de carrito anónimo con opciones de reintento
 * o continuar con la sesión iniciada sin combinar (RN-F020-05 / CA-F020-04).
 */
export const MergeFailureNotice: React.FC<MergeFailureNoticeProps> = ({
  busy = false,
  canRetry = true,
  onRetry,
  onContinueWithoutMerge,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="merge-failure-notice rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">No pudimos combinar tu carrito de invitado</h3>
          <p className="mt-1 text-sm text-amber-800">
            Puedes reintentar la combinación o continuar con los productos de tu cuenta sin combinar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canRetry && (
            <button
              type="button"
              disabled={busy}
              onClick={onRetry}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? 'Reintentando…' : 'Reintentar combinación'}
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onContinueWithoutMerge}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Continuar sin combinar
          </button>
        </div>
      </div>
    </div>
  );
};

