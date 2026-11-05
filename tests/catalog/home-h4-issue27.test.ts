import { expect, it } from 'vitest';
import { isHome } from '../../src/features/catalog/api';

const category = { categoryId: 'running', name: 'Running' };
const card = { productId: 'p1', slug: 'polo', name: 'Polo', categoryId: 'running', brandId: 'b1', image: null };

it('accepts an empty home without treating it as a transport failure', () => {
  expect(isHome({ categories: [], featuredProducts: [] })).toBe(true);
});
it('keeps a featured card without an image eligible for the local placeholder', () => {
  expect(isHome({ categories: [category], featuredProducts: [card] })).toBe(true);
});
it('rejects duplicate category links instead of rendering duplicate React keys', () => {
  expect(isHome({ categories: [category, { ...category, name: 'Other' }], featuredProducts: [] })).toBe(false);
});
it('rejects duplicate featured products even if their display names differ', () => {
  expect(isHome({ categories: [], featuredProducts: [card, { ...card, name: 'Other' }] })).toBe(false);
});
