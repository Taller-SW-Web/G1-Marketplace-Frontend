/**
 * Tipos y contratos para el módulo de Carrito de Compras (F-016 a F-021).
 * Cumple con SPEC-04, DS-001 v0.2.0 y ARQUITECTURA-REACT.
 */

export type AvailabilityState = 'UNSELECTED' | 'UNAVAILABLE' | 'AVAILABLE' | 'STOCK_LOW';

export interface CartUnitPrice {
  amount: number;
  currency: string;
  version?: number;
}

export interface CartItemDTO {
  sku: string;
  name?: string;
  quantity: number;
  unitPrice?: CartUnitPrice;
  imageUrl?: string;
  variantName?: string;
  availability?: AvailabilityState;
  attention?: string | null;
}

export interface CartSnapshot {
  cartId: string | null;
  version: number;
  items: CartItemDTO[];
  subtotal?: {
    amount: number;
    currency: string;
  } | null;
}

export type CartMutationCode =
  | 'ITEM_CREATED'
  | 'ITEM_INCREMENTED'
  | 'QUANTITY_UPDATED'
  | 'ITEM_REMOVED'
  | 'STOCK_LIMIT_REACHED'
  | 'INVALID_QUANTITY'
  | 'SKU_NOT_AVAILABLE'
  | 'CART_CONFLICT'
  | 'COMMERCE_DATA_UNAVAILABLE'
  | 'ERROR';

export interface CartMutationResult {
  success: boolean;
  status: 200 | 201 | 400 | 404 | 409 | 500 | 503;
  code: CartMutationCode;
  message: string;
  item?: CartItemDTO;
  cart?: CartSnapshot;
}

export interface AddToCartPayload {
  /** Legacy direct-SKU callers remain supported; product detail sends productId. */
  sku?: string;
  productId?: string;
  quantity: 1;
}

export interface AddToCartActionProps {
  productId?: string;
  availability: AvailabilityState;
  priceReady: boolean;
  busy: boolean;
  onAdd: (payload: AddToCartPayload) => void;
  onRetryAvailability?: () => void;
}

export interface AddedToCartFeedbackProps {
  result: CartMutationResult | null;
  opened: boolean;
  onViewCart: () => void;
  onContinue: () => void;
  onClose?: () => void;
}

export type AddCartFlowState =
  | 'UNSELECTED'
  | 'UNAVAILABLE'
  | 'READY'
  | 'ADDING'
  | 'ADDED'
  | 'ADJUSTED'
  | 'ERROR';

export interface UndoRemovalFeedbackProps {
  label: string;
  canUndo?: boolean;
  remainingSeconds?: number;
  busy?: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

export interface MergeAdjustment {
  sku: string;
  requestedQuantity: number;
  confirmedQuantity: number;
  reason: 'STOCK_LIMIT' | 'COMMERCE_POLICY' | string;
}

export interface CartMergeResult {
  cartId: string;
  version: number;
  merged: boolean;
  adjustments: MergeAdjustment[];
}

export type MergeStatus = 'IDLE' | 'MERGING' | 'MERGED' | 'NO_SOURCE' | 'FAILED' | 'DEFERRED';

export interface CartMergeCoordinatorProps {
  sessionReady: boolean;
  returnPath?: string;
  onMerged?: (result: CartMergeResult) => void;
  onFailed?: () => void;
}

export interface MergeFailureNoticeProps {
  busy?: boolean;
  canRetry?: boolean;
  onRetry: () => void;
  onContinueWithoutMerge: () => void;
}

export interface MergeAdjustmentsDialogProps {
  adjustments: MergeAdjustment[];
  opened: boolean;
  onViewCart?: () => void;
  onClose: () => void;
}
