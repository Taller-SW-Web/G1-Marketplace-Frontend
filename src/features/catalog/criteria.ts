export type FilterDraft = { categoryIds: string; brandIds: string; minPrice: string; maxPrice: string };
export const filterKeys = ['categoryIds', 'brandIds', 'minPrice', 'maxPrice'] as const;
export const allowedSorts = ['NAME_ASC', 'NAME_DESC'] as const;

export function filterDraft(query: string): FilterDraft {
  const params = new URLSearchParams(query);
  return Object.fromEntries(filterKeys.map(key => [key, params.get(key) ?? ''])) as FilterDraft;
}

export function priceError(draft: FilterDraft): string {
  const values = [draft.minPrice, draft.maxPrice];
  if (values.some(value => value !== '' && (!/^\d{1,13}(?:\.\d{1,2})?$/.test(value) || !Number.isSafeInteger(Math.round(Number(value) * 100)))))
    return 'Ingresa precios en soles, no negativos y con hasta dos decimales.';
  if (values.every(value => value !== '') && Number(draft.minPrice) > Number(draft.maxPrice))
    return 'El precio mínimo no puede superar al máximo.';
  return '';
}

/** Build only a local URL. Criteria changes reset page, while paging preserves context. */
export function catalogHref(query: string, changes: Record<string, string | undefined>, resetPage = true): string {
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  if (resetPage) params.delete('page');
  return `/catalogo${params.size ? `?${params}` : ''}`;
}

export function criteriaError(query: string): string {
  const params = new URLSearchParams(query);
  const allowed = new Set(['q', 'page', 'pageSize', 'sort', ...filterKeys]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) return 'Revisa los criterios del enlace o vuelve al catálogo.';
  }
  const sort = params.get('sort');
  if (sort !== null && !allowedSorts.some(value => value === sort)) return 'Revisa los criterios del enlace o vuelve al catálogo.';
  for (const key of ['page', 'pageSize']) {
    const value = params.get(key);
    if (value === null) continue;
    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < (key === 'page' ? 0 : 1) || number > (key === 'page' ? 1000000 : 48))
      return 'No encontramos esa página del catálogo. Vuelve a la primera página.';
  }
  for (const key of ['categoryIds', 'brandIds']) {
    const value = params.get(key);
    if (value !== null && !/^[\p{L}\p{N}_-]{1,120}$/u.test(value)) return 'Revisa la categoría o marca seleccionada.';
  }
  if (['minPrice', 'maxPrice'].some(key => params.has(key) && params.get(key) === '')) return 'Revisa el rango de precios en soles.';
  return priceError(filterDraft(query));
}
