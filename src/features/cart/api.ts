import type { AddToCartPayload, CartItemDTO, CartMutationCode, CartMutationResult, CartSnapshot } from './types';

// Almacén en memoria para simular persistencia MOCK en Hito 3 si el backend no está disponible
let mockCart: CartSnapshot = {
  cartId: 'MOCK-CART-001',
  version: 1,
  items: [],
};

interface BffErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

interface BffSuccessResponse {
  data?: {
    cartId: string;
    version: number;
    items?: CartItemDTO[];
  };
}

/**
 * Cliente de Cart API con soporte para modo MOCK (Hito 3 / Semana 8)
 * y llamada real al BFF cuando esté disponible.
 */
export async function addCartItemApi(
  payload: AddToCartPayload,
  useMock: boolean = true
): Promise<CartMutationResult> {
  if (useMock) {
    // Simulación MOCK controlada para H3
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Regla de simulación de rechazo por producto sin stock (caso negativo para QA)
    if (payload.sku.toUpperCase().includes('OUT-OF-STOCK') || payload.sku === 'SKU-UNAVAILABLE') {
      return {
        success: false,
        status: 404,
        code: 'SKU_NOT_AVAILABLE',
        message: 'El producto solicitado no está disponible para compra.',
      };
    }

    // Regla de simulación de límite de stock (409 STOCK_LIMIT_REACHED)
    const existingIndex = mockCart.items.findIndex((it) => it.sku === payload.sku);
    if (existingIndex >= 0 && mockCart.items[existingIndex].quantity >= 3) {
      return {
        success: true, // El carrito existe y fue ajustado al máximo
        status: 409,
        code: 'STOCK_LIMIT_REACHED',
        message: 'Ajustamos la cantidad al máximo disponible (3 unidades).',
        item: { ...mockCart.items[existingIndex] },
        cart: { ...mockCart },
      };
    }

    if (existingIndex >= 0) {
      // Línea incrementada (200)
      mockCart.version += 1;
      mockCart.items[existingIndex].quantity += 1;
      return {
        success: true,
        status: 200,
        code: 'ITEM_INCREMENTED',
        message: 'Producto incrementado en el carrito.',
        item: { ...mockCart.items[existingIndex] },
        cart: { ...mockCart },
      };
    }

    // Línea creada (201)
    mockCart.version += 1;
    const newItem: CartItemDTO = {
      sku: payload.sku,
      name: 'Camiseta Deportiva Inka Pro',
      quantity: 1,
      unitPrice: {
        amount: 89.9,
        currency: 'PEN',
        version: 1,
      },
    };
    mockCart.items.push(newItem);

    return {
      success: true,
      status: 201,
      code: 'ITEM_CREATED',
      message: 'Producto agregado al carrito.',
      item: newItem,
      cart: { ...mockCart },
    };
  }

  // Llamada real al BFF de Next.js
  try {
    const res = await fetch('/api/cart/current/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const json = (await res.json().catch(() => ({}))) as BffErrorResponse & BffSuccessResponse;

    if (!res.ok) {
      return {
        success: false,
        status: (res.status === 400 || res.status === 404 || res.status === 409 || res.status === 503 ? res.status : 500),
        code: (json.error?.code as CartMutationCode) || 'ERROR',
        message: json.error?.message || 'Error al agregar el producto al carrito.',
      };
    }

    const cartData = json.data as CartSnapshot | undefined;
    const items = cartData?.items ?? [];
    return {
      success: true,
      status: (res.status === 201 ? 201 : 200),
      code: res.status === 201 ? 'ITEM_CREATED' : 'ITEM_INCREMENTED',
      message: 'Operación confirmada por el servidor.',
      item: items.find((i) => i.sku === payload.sku),
      cart: cartData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'No fue posible conectar con el servidor backend.';
    return {
      success: false,
      status: 503,
      code: 'COMMERCE_DATA_UNAVAILABLE',
      message,
    };
  }
}

/**
 * Obtener carrito actual (para F-019)
 */
export async function getCartApi(useMock: boolean = true): Promise<CartSnapshot> {
  if (useMock) {
    return { ...mockCart };
  }
  const res = await fetch('/api/cart/current', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status}: no se pudo obtener el carrito del backend`);
  }
  const json = await res.json();
  const data = json.data;
  return {
    cartId: data?.cartId ?? null,
    version: data?.version ?? 0,
    items: (data?.items ?? []).map((it: CartItemDTO) => ({
      sku: it.sku,
      name: it.sku.replace('INKA-', '').replace(/-/g, ' '),
      quantity: it.quantity,
      unitPrice: it.unitPrice
        ? {
            amount: Number(it.unitPrice.amount),
            currency: it.unitPrice.currency || 'PEN',
            version: it.unitPrice.version || 1,
          }
        : undefined,
    })),
  };
}

/**
 * Reiniciar mock para pruebas unitarias
 */
export function resetMockCart() {
  mockCart = {
    cartId: 'MOCK-CART-001',
    version: 1,
    items: [],
  };
}
