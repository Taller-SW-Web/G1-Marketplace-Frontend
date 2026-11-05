import { expect, it } from 'vitest';
import { recoverCatalogHref, criteriaError } from '../../src/features/catalog/criteria';
it.each([
  ['q=running&sort=NAME_ASC&categoryIds=running&page=-1&pageSize=4', '/catalogo?q=running&pageSize=4&sort=NAME_ASC&categoryIds=running'],
  ['q=x&brandIds=brand&minPrice=0&sort=NAME_DESC&page=3', '/catalogo?sort=NAME_DESC&brandIds=brand&minPrice=0'],
  ['q=polo&sort=bad&pageSize=49&scope=admin', '/catalogo?q=polo'],
  ['q=polo&categoryIds=a&categoryIds=b&brandIds=brand', '/catalogo?q=polo&brandIds=brand'],
  ['q=polo&minPrice=30&maxPrice=10&sort=NAME_ASC', '/catalogo?q=polo&sort=NAME_ASC'],
  ['q=aa&q=bb&page=-1', '/catalogo'],
])('recovers %s without dropping valid context', (query, expected) => {
  const result = recoverCatalogHref(query);
  expect(result).toBe(expected);
  expect(criteriaError(result.split('?')[1] ?? '')).toBe('');
});
