"use client";
import { useId, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import type { CatalogFiltersDTO, HomeDTO, QueryState } from './types';
import { catalogHref, filterDraft, filterKeys, priceError } from './criteria';

type Props = { query: string; options: QueryState<CatalogFiltersDTO>; fallbackCategories?: QueryState<HomeDTO>; retryCategories?: () => void; retry: () => void; onApply: (url: string) => void };

function FilterForm({ query, options, fallbackCategories, retryCategories, onApply, retry }: Props) {
  const [draft, setDraft] = useState(() => filterDraft(query));
  const id = useId();
  const error = priceError(draft);
  const categoriesReady = options.status === 'ready' || fallbackCategories?.status === 'ready';
  const categories = options.status === 'ready' ? options.data.categories : fallbackCategories?.status === 'ready' ? fallbackCategories.data.categories : [];
  const brands = options.status === 'ready' ? options.data.brands : [];
  const update = (key: keyof typeof draft, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  return <form className="catalog-filter-form" onSubmit={event => {
    event.preventDefault();
    if (!error) onApply(catalogHref(query, draft));
  }}>
    <fieldset>
      <legend className="sr-only">Filtrar productos</legend>
      <label htmlFor={`${id}-category`}>Categoría</label>
      <select id={`${id}-category`} disabled={!categoriesReady} value={draft.categoryIds} onChange={event => update('categoryIds', event.target.value)}>
        <option value="">Todas las categorías</option>
        {draft.categoryIds && !categories.some(item => item.categoryId === draft.categoryIds) && <option value={draft.categoryIds}>Categoría aplicada: {draft.categoryIds}</option>}
        {categories.map(item => <option key={item.categoryId} value={item.categoryId}>{item.name}</option>)}
      </select>
      <label htmlFor={`${id}-brand`}>Marca</label>
      <select id={`${id}-brand`} disabled={options.status !== 'ready'} value={draft.brandIds} onChange={event => update('brandIds', event.target.value)}>
        <option value="">Todas las marcas</option>
        {draft.brandIds && !brands.some(item => item.brandId === draft.brandIds) && <option value={draft.brandIds}>Marca aplicada: {draft.brandIds}</option>}
        {brands.map(item => <option key={item.brandId} value={item.brandId}>{item.name}</option>)}
      </select>
      <fieldset className="catalog-price-range">
        <legend>Precio en soles (S/)</legend>
        <label htmlFor={`${id}-min`}>Precio mínimo</label>
        <input id={`${id}-min`} inputMode="decimal" type="text" value={draft.minPrice} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => update('minPrice', event.target.value)} />
        <label htmlFor={`${id}-max`}>Precio máximo</label>
        <input id={`${id}-max`} inputMode="decimal" type="text" value={draft.maxPrice} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => update('maxPrice', event.target.value)} />
        {error && <p className="catalog-filter-error" id={`${id}-error`} role="alert">{error}</p>}
      </fieldset>
    </fieldset>
    {options.status === 'loading' && <p role="status">Cargando filtros…</p>}
    {options.status === 'error' && <div>
      <p role="alert">No pudimos cargar las marcas de los filtros.</p>
      <Button onClick={retry}>Reintentar filtros</Button>
      {fallbackCategories?.status === 'loading' && <p role="status">Cargando categorías…</p>}
      {fallbackCategories?.status === 'error' && <><p role="alert">No pudimos cargar las categorías.</p>{retryCategories && <Button onClick={retryCategories}>Reintentar categorías</Button>}</>}
    </div>}
    <div className="catalog-filter-actions">
      <Button variant="secondary" disabled={!Object.values(draft).some(Boolean)} onClick={() => setDraft({ categoryIds: '', brandIds: '', minPrice: '', maxPrice: '' })}>Limpiar</Button>
      <Button type="submit" disabled={Boolean(error)}>Aplicar filtros</Button>
    </div>
  </form>;
}

export function CatalogFilters(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const closingAfterApply = useRef(false);
  const [version, setVersion] = useState(0);
  const titleId = useId();
  const summaryId = useId();
  const appliedCount = Object.values(filterDraft(props.query)).filter(Boolean).length;
  return <aside className="catalog-filters" aria-label="Filtros del catálogo">
    <div className="catalog-filters-desktop"><h2>Filtros</h2><FilterForm key={props.query} {...props} /></div>
    <Button className="catalog-filters-trigger" ref={trigger} variant="secondary" aria-haspopup="dialog" aria-label={appliedCount ? `Filtros (${appliedCount})` : 'Filtros'} endIcon={<img src="/figma/catalog-filter-arrow-20.svg" alt="" width="20" height="20" />} onClick={() => {
      closingAfterApply.current = false;
      setVersion(previous => previous + 1);
      dialog.current?.showModal();
      title.current?.focus();
    }}>Filtros{appliedCount > 0 && <span className="catalog-filter-count" aria-hidden="true">{appliedCount}</span>}</Button>
    <dialog className="catalog-filter-dialog" ref={dialog} aria-labelledby={titleId} aria-describedby={summaryId} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); title.current?.focus(); return; }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) { event.preventDefault(); last.focus(); }
    }} onCancel={event => { event.preventDefault(); dialog.current?.close(); }} onClose={() => {
      if (!closingAfterApply.current) trigger.current?.focus();
      closingAfterApply.current = false;
    }}>
      <div className="catalog-filter-dialog-heading"><h2 id={titleId} tabIndex={-1} ref={title}>Filtros</h2><Button variant="secondary" onClick={() => dialog.current?.close()}>Cerrar</Button></div>
      <p className="catalog-filter-summary" id={summaryId}>{appliedCount ? `${appliedCount} ${appliedCount === 1 ? 'filtro aplicado' : 'filtros aplicados'}` : 'Sin filtros aplicados'}</p>
      <FilterForm key={`${version}-${props.query}`} {...props} onApply={url => { closingAfterApply.current = true; dialog.current?.close(); props.onApply(url); }} />
    </dialog>
  </aside>;
}

export function ActiveFilterChips({ query, options, fallbackCategories, onChange }: { query: string; options: QueryState<CatalogFiltersDTO>; fallbackCategories?: QueryState<HomeDTO>; onChange: (url: string) => void }) {
  const draft = filterDraft(query);
  const categories = options.status === 'ready' ? options.data.categories : fallbackCategories?.status === 'ready' ? fallbackCategories.data.categories : [];
  const labels: Record<string, string> = {
    categoryIds: categories.find(item => item.categoryId === draft.categoryIds)?.name ?? draft.categoryIds,
    brandIds: options.status === 'ready' ? options.data.brands.find(item => item.brandId === draft.brandIds)?.name ?? draft.brandIds : draft.brandIds,
    minPrice: `Desde S/ ${draft.minPrice}`, maxPrice: `Hasta S/ ${draft.maxPrice}`,
  };
  const names = { categoryIds: 'categoría', brandIds: 'marca', minPrice: 'precio mínimo', maxPrice: 'precio máximo' };
  const active = filterKeys.filter(key => draft[key]);
  if (!active.length) return null;
  return <div className="active-criteria" aria-label="Filtros aplicados">
    {active.map(key => <button type="button" key={key} aria-label={`Quitar ${names[key]} ${labels[key]}`} onClick={() => onChange(catalogHref(query, { [key]: undefined }))}>{labels[key]} <span aria-hidden="true">×</span></button>)}
    <button type="button" onClick={() => onChange(catalogHref(query, Object.fromEntries(filterKeys.map(key => [key, undefined]))))}>Limpiar filtros</button>
  </div>;
}
