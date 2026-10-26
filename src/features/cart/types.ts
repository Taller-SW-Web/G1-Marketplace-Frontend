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
}

export interface CartSnapshot {
  cartId: string;
  version: number;
  items: CartItemDTO[];
}

export type CartMutationCode =
  | 'ITEM_CREATED'
  | 'ITEM_INCREMENTED'
  | 'QUANTITY_UPDATED'
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
  sku: string;
  quantity: 1;
}

export interface AddToCartActionProps {
  sku?: string;
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
