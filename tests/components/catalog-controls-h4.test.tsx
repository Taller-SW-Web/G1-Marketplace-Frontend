import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CatalogFilters, ActiveFilterChips } from '../../src/features/catalog/CatalogFilters';
import { CatalogPagination } from '../../src/features/catalog/CatalogPagination';
import { CatalogSortSelect } from '../../src/features/catalog/CatalogSortSelect';
import type { CatalogFiltersDTO, QueryState } from '../../src/features/catalog/types';

const options: QueryState<CatalogFiltersDTO> = { status: 'ready', source: 'MOCK', data: {
  categories: [{ categoryId: 'cat', name: 'Ropa' }], brands: [{ brandId: 'brand', name: 'Marca' }],
} };

it('does not apply filter drafts until submit and prevents inverted prices', () => {
  const apply = vi.fn();
  const { container } = render(<CatalogFilters query="q=polo&sort=NAME_DESC&page=3" options={options} retry={vi.fn()} onApply={apply} />);
  const form = container.querySelector('.catalog-filters-desktop form')!;
  const min = form.querySelector('input')!;
  const max = form.querySelectorAll('input')[1];
  fireEvent.change(min, { target: { value: '20' } });
  fireEvent.change(max, { target: { value: '10' } });
  fireEvent.submit(form);
  expect(apply).not.toHaveBeenCalled();
  expect(min.getAttribute('aria-invalid')).toBe('true');
  fireEvent.change(max, { target: { value: '30' } });
  expect(apply).not.toHaveBeenCalled();
  fireEvent.submit(form);
  expect(apply).toHaveBeenCalledWith('/catalogo?q=polo&sort=NAME_DESC&minPrice=20&maxPrice=30');
});

it('removes one chip and clears filters without clearing query or order', () => {
  const change = vi.fn();
  render(<ActiveFilterChips query="q=polo&brandIds=brand&minPrice=0&sort=NAME_ASC&page=2" options={options} onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'Quitar marca Marca' }));
  expect(change).toHaveBeenLastCalledWith('/catalogo?q=polo&minPrice=0&sort=NAME_ASC');
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(change).toHaveBeenLastCalledWith('/catalogo?q=polo&sort=NAME_ASC');
});

it('offers only supported sort modes', () => {
  const change = vi.fn();
  render(<CatalogSortSelect value="" onChange={change} />);
  expect(screen.getAllByRole('option').map(option => option.getAttribute('value'))).toEqual(['', 'NAME_ASC', 'NAME_DESC']);
  fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'NAME_DESC' } });
  expect(change).toHaveBeenCalledWith('NAME_DESC');
});

it('limits page navigation and blocks duplicate loading actions', () => {
  const change = vi.fn();
  const { rerender } = render(<CatalogPagination page={{ number: 0, size: 24, totalElements: 25, totalPages: 2 }} onChange={change} />);
  expect((screen.getByRole('button', { name: '← Anterior' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente →' }));
  expect(change).toHaveBeenCalledWith(1);
  rerender(<CatalogPagination page={{ number: 1, size: 24, totalElements: 25, totalPages: 2 }} busy onChange={change} />);
  expect(screen.getAllByRole('button').every(button => (button as HTMLButtonElement).disabled)).toBe(true);
});
