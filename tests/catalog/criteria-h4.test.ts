import { describe, expect, it } from 'vitest';
import { catalogHref, criteriaError, filterDraft, priceError } from '../../src/features/catalog/criteria';
import { isCatalogFilters, isCatalogPage } from '../../src/features/catalog/api';

describe('H4 URL and public data boundaries', () => {
  it('changes filters/ordering without losing search and resets the previous page', () => {
    const query = 'q=running&categoryIds=cat&sort=NAME_DESC&page=3&pageSize=4';
    const url = catalogHref(query, { brandIds: 'brand', minPrice: '0' });
    const result = new URL(url, 'https://local.example');
    expect(result.pathname).toBe('/catalogo');
    expect(Object.fromEntries(result.searchParams)).toEqual({ q: 'running', categoryIds: 'cat', sort: 'NAME_DESC', pageSize: '4', brandIds: 'brand', minPrice: '0' });
    expect(catalogHref(query, { page: '2' }, false)).toContain('page=2');
  });
  it('clears only selected criteria and permits zero', () => {
    const query = 'q=polo&sort=NAME_ASC&brandIds=brand&minPrice=0&page=1';
    expect(catalogHref(query, { brandIds: undefined, minPrice: '' })).toBe('/catalogo?q=polo&sort=NAME_ASC');
    expect(priceError(filterDraft('minPrice=0&maxPrice=0'))).toBe('');
  });
  it.each(['sort=PRICE_ASC', 'page=-1', 'page=NaN', 'pageSize=49', 'pageSize=0', 'q=aa&q=bb',
    'categoryIds=a,b', 'brandIds=../admin', 'minPrice=-1', 'minPrice=1e2', 'minPrice=',
    'minPrice=20&maxPrice=10', 'maxPrice=0.001', 'scope=admin'])('rejects invalid shared URL %s', query => {
    expect(criteriaError(query)).not.toBe('');
  });
  it('accepts all supported criteria together', () => {
    expect(criteriaError('q=polo&categoryIds=cat&brandIds=brand&minPrice=0&maxPrice=100.25&sort=NAME_DESC&page=1&pageSize=48')).toBe('');
  });
  it('rejects incomplete page metadata and duplicate cards', () => {
    const card = { productId: 'p1', slug: 'polo', name: 'Polo', categoryId: 'cat', brandId: 'brand', image: null };
    expect(isCatalogPage({ data: [card], page: { number: 0, size: 24, totalElements: 1, totalPages: 1 } })).toBe(true);
    expect(isCatalogPage({ data: [card], page: { number: 0, size: 24, totalElements: 0, totalPages: 0 } })).toBe(false);
    expect(isCatalogPage({ data: [card, card], page: { number: 0, size: 24, totalElements: 2, totalPages: 1 } })).toBe(false);
  });
  it('checks active masters DTOs rather than accepting missing brands', () => {
    expect(isCatalogFilters({ categories: [], brands: [] })).toBe(true);
    expect(isCatalogFilters({ categories: [] })).toBe(false);
    expect(isCatalogFilters({ categories: [], brands: [{ brandId: 'b', name: '' }] })).toBe(false);
  });
});
