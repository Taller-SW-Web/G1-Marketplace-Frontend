import { expect, it, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/react';
import { CatalogFilters } from '../../src/features/catalog/CatalogFilters';
it('clears applied filters immediately, keeping search, order and size and resetting page', () => {
  const apply = vi.fn();
  const { container } = render(<CatalogFilters query="q=polo&sort=NAME_DESC&pageSize=4&page=2&minPrice=10" options={{ status: 'loading' }} retry={vi.fn()} onApply={apply} />);
  const form = container.querySelector('.catalog-filters-desktop form')!;
  // Emptying the draft has not yet removed the applied minPrice from the URL.
  fireEvent.change(form.querySelector('input')!, { target: { value: '' } });
  const clear = within(form as HTMLElement).getByRole('button', { name: 'Limpiar' }) as HTMLButtonElement;
  expect(clear.disabled).toBe(false);
  fireEvent.click(clear);
  expect(apply).toHaveBeenCalledExactlyOnceWith('/catalogo?q=polo&sort=NAME_DESC&pageSize=4');
  expect(Array.from(form.querySelectorAll('input')).every(input => input.value === '')).toBe(true);
});
