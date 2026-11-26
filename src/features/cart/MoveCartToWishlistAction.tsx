'use client';

import React from 'react';
import type { MoveCartToWishlistActionProps } from './types';
import { Button } from '@/shared/ui/Button';

/**
 * CMP-F021-001: MoveCartToWishlistAction
 * Botón accesible para mover un producto del carrito a la lista de deseos / favoritos (V-008).
 * Si el usuario no está autenticado, solicita inicio de sesión sin mutar el carrito (RN-F021-02).
 */
export const MoveCartToWishlistAction: React.FC<MoveCartToWishlistActionProps> = ({
  sku,
  authenticated = true,
  busy = false,
  onMove,
  onRequireAuth,
}) => {
  const handleClick = async () => {
    if (!authenticated) {
      onRequireAuth?.('/carrito');
      return;
    }
    await onMove?.(sku);
  };

  return (
    <Button
      type="button"
      variant="tertiary"
      size="sm"
      disabled={busy}
      onClick={handleClick}
      aria-label={`Guardar producto ${sku} en favoritos`}
      className="move-to-wishlist-action"
    >
      {busy ? 'Guardando…' : 'Guardar para después'}
    </Button>
  );
};

