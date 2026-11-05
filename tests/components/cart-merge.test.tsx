import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CartMergeCoordinator } from '../../src/features/cart/CartMergeCoordinator';
import { MergeFailureNotice } from '../../src/features/cart/MergeFailureNotice';
import { MergeAdjustmentsDialog } from '../../src/features/cart/MergeAdjustmentsDialog';
import * as cartApi from '../../src/features/cart/api';

describe('TASK-F020-FE-001 / TASK-F020-QA-001 / CMP-F020-001: CartMergeCoordinator', () => {
  it('RC-F-020-02: MFA incompleto o sessionReady=false NO dispara la llamada de fusion', () => {
    const mergeSpy = vi.spyOn(cartApi, 'mergeAnonymousCartApi');
    const onMerged = vi.fn();

    render(
      <CartMergeCoordinator
        sessionReady={false}
        onMerged={onMerged}
      />
    );

    expect(mergeSpy).not.toHaveBeenCalled();
    expect(onMerged).not.toHaveBeenCalled();
    expect(screen.queryByText(/Sincronizando los productos de tu carrito/i)).toBeNull();
  });

  it('RC-F-020-01: cuando sessionReady=true dispara la fusion y notifica onMerged', async () => {
    vi.spyOn(cartApi, 'mergeAnonymousCartApi').mockResolvedValueOnce({
      cartId: 'MOCK-AUTH-1',
      version: 2,
      merged: true,
      adjustments: [],
    });

    const onMerged = vi.fn();

    render(
      <CartMergeCoordinator
        sessionReady={true}
        onMerged={onMerged}
      />
    );

    await waitFor(() => {
      expect(onMerged).toHaveBeenCalledTimes(1);
    });

    expect(onMerged).toHaveBeenCalledWith(
      expect.objectContaining({
        cartId: 'MOCK-AUTH-1',
        merged: true,
      })
    );
  });

  it('RC-F-020-04: si existen ajustes por stock abre el dialogo MergeAdjustmentsDialog', async () => {
    vi.spyOn(cartApi, 'mergeAnonymousCartApi').mockResolvedValueOnce({
      cartId: 'MOCK-AUTH-2',
      version: 3,
      merged: true,
      adjustments: [
        {
          sku: 'INKA-CAP-SKU',
          requestedQuantity: 110,
          confirmedQuantity: 99,
          reason: 'STOCK_LIMIT',
        },
      ],
    });

    const onMerged = vi.fn();

    render(
      <CartMergeCoordinator
        sessionReady={true}
        onMerged={onMerged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ajustes en tu carrito')).toBeDefined();
    });

    expect(screen.getByText('INKA-CAP-SKU')).toBeDefined();
    expect(screen.getByText(/Solicitaste 110 · Ajustado a 99/i)).toBeDefined();
  });

  it('renderiza MergeFailureNotice ante fallo y permite reintentar o continuar sin combinar', async () => {
    vi.spyOn(cartApi, 'mergeAnonymousCartApi').mockRejectedValueOnce(
      new Error('Network merge error')
    );

    const onFailed = vi.fn();

    render(
      <CartMergeCoordinator
        sessionReady={true}
        onFailed={onFailed}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('No pudimos combinar tu carrito de invitado')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reintentar combinación' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continuar sin combinar' })).toBeDefined();
  });
});

describe('CMP-F020-002: MergeFailureNotice', () => {
  it('RC-F-020-03: continuar sin combinar llama a onContinueWithoutMerge y conserva la sesion', () => {
    const onRetry = vi.fn();
    const onContinueWithoutMerge = vi.fn();

    render(
      <MergeFailureNotice
        busy={false}
        canRetry={true}
        onRetry={onRetry}
        onContinueWithoutMerge={onContinueWithoutMerge}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continuar sin combinar' }));
    expect(onContinueWithoutMerge).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('permite reintentar la combinacion al pulsar Reintentar combinacion', () => {
    const onRetry = vi.fn();
    const onContinueWithoutMerge = vi.fn();

    render(
      <MergeFailureNotice
        busy={false}
        canRetry={true}
        onRetry={onRetry}
        onContinueWithoutMerge={onContinueWithoutMerge}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar combinación' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('CMP-F020-003: MergeAdjustmentsDialog', () => {
  it('CA-F020-03: muestra dialog con lista de ajustes y se cierra al hacer clic en Entendido', () => {
    const onClose = vi.fn();
    const onViewCart = vi.fn();

    const adjustments = [
      {
        sku: 'AERO-42-BLK',
        requestedQuantity: 5,
        confirmedQuantity: 2,
        reason: 'STOCK_LIMIT',
      },
    ];

    render(
      <MergeAdjustmentsDialog
        adjustments={adjustments}
        opened={true}
        onClose={onClose}
        onViewCart={onViewCart}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Ajustes en tu carrito')).toBeDefined();
    expect(screen.getByText('AERO-42-BLK')).toBeDefined();
    expect(screen.getByText(/Solicitaste 5 · Ajustado a 2/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no renderiza nada si opened=false o adjustments esta vacio', () => {
    const { container } = render(
      <MergeAdjustmentsDialog
        adjustments={[]}
        opened={false}
        onClose={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

