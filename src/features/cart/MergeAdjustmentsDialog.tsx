'use client';

import React from 'react';
import type { MergeAdjustmentsDialogProps } from './types';

/**
 * CMP-F020-003: MergeAdjustmentsDialog
 * Diálogo accesible (O-007) para informar ajustes de cantidades por límite de stock
 * o políticas comerciales tras la fusión de carritos (CA-F020-03).
 */
export const MergeAdjustmentsDialog: React.FC<MergeAdjustmentsDialogProps> = ({
  adjustments,
  opened,
  onViewCart,
  onClose,
}) => {
  if (!opened || adjustments.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjustments-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="adjustments-dialog-title" className="text-lg font-bold text-gray-900">
          Ajustes en tu carrito
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Al combinar tus productos de invitado con tu cuenta, realizamos los siguientes ajustes por disponibilidad de stock:
        </p>

        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
          {adjustments.map((adj) => (
            <li key={adj.sku} className="py-2 flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold text-gray-800">{adj.sku}</span>
                <span className="block text-xs text-gray-500">
                  Solicitaste {adj.requestedQuantity} · Ajustado a {adj.confirmedQuantity}
                </span>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Límite de stock
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-3">
          {onViewCart && (
            <button
              type="button"
              onClick={onViewCart}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Ver carrito
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

