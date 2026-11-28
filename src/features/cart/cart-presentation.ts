import { isCatalogPage, readCatalog } from '@/features/catalog/api';
import { fetchProductVariants } from '@/features/catalog/services/product-variants.service';
import type { CartItemPresentation, CartItemPreview } from './types';

const storageKey = (sku: string) => `inka-cart-preview:${sku}`;
const requests = new Map<string, Promise<CartItemPresentation | undefined>>();

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function readCartPresentation(value: unknown): CartItemPresentation {
  if (!value || typeof value !== 'object') return {};
  const item = value as Record<string, unknown>;
  const product = item.product && typeof item.product === 'object'
    ? item.product as Record<string, unknown> : undefined;
  const name = stringValue(product?.name) ?? stringValue(item.name);
  const imageUrl = stringValue(product?.imageUrl) ?? stringValue(item.imageUrl);
  const variantName = stringValue(item.variantName);
  return {
    ...(name ? { name } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(variantName ? { variantName } : {}),
  };
}

export function rememberCartPresentation(sku: string, presentation: CartItemPresentation) {
  try {
    const previous = getRememberedPresentation(sku);
    sessionStorage.setItem(storageKey(sku), JSON.stringify({ ...previous, ...readCartPresentation(presentation) }));
  } catch {
    // Session storage can be unavailable. The cart still uses the server snapshot.
  }
}

function getRememberedPresentation(sku: string): CartItemPresentation {
  try {
    return readCartPresentation(JSON.parse(sessionStorage.getItem(storageKey(sku)) ?? 'null'));
  } catch {
    return {};
  }
}

async function matchCatalogSku(sku: string): Promise<CartItemPresentation | undefined> {
  const code = sku.split('-').find(part => /^(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{4,20}$/i.test(part));
  if (!code) return;
  const params = new URLSearchParams({ q: code, pageSize: '3' });
  const signal = AbortSignal.timeout(6_000);
  const { data } = await readCatalog(`products?${params}`, isCatalogPage, signal);
  const lookups = await Promise.allSettled(data.data.map(async product => {
    const { data } = await fetchProductVariants(product.slug, signal);
    const variant = data.productId === product.productId && data.variants.find(item => item.sku === sku);
    if (!variant) return;
    const variantName = data.attributes.map(attribute =>
      attribute.values.find(value => value.id === variant.attributes[attribute.id])?.label
    ).filter(Boolean).join(' · ');
    return readCartPresentation({ name: product.name, imageUrl: variant.image?.url ?? product.image?.url, variantName });
  }));
  const match = lookups.find(result => result.status === 'fulfilled' && result.value);
  return match?.status === 'fulfilled' ? match.value : undefined;
}

export function resolveCartPresentation(line: Omit<CartItemPreview, 'quantity'>): Promise<CartItemPresentation | undefined> {
  const remembered = getRememberedPresentation(line.sku);
  if ((line.imageUrl || remembered.imageUrl) && (line.name || remembered.name)) {
    return Promise.resolve(remembered);
  }
  const pending = requests.get(line.sku);
  if (pending) return pending;
  const request = matchCatalogSku(line.sku).then(result => {
    if (result) {
      rememberCartPresentation(line.sku, result);
      return { ...remembered, ...result };
    }
    return remembered;
  }).catch(() => remembered).finally(() => requests.delete(line.sku));
  requests.set(line.sku, request);
  return request;
}
