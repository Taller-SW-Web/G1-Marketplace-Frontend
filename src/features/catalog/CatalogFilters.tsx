"use client";
import { useEffect, useId, useRef, useState } from 'react';
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
      <div className="catalog-facet">
        <label className="sr-only" htmlFor={`${id}-category`}>Categoría</label>
        <select id={`${id}-category`} disabled={!categoriesReady} value={draft.categoryIds} onChange={event => update('categoryIds', event.target.value)}>
          <option value="">Categoría</option>
          {draft.categoryIds && !categories.some(item => item.categoryId === draft.categoryIds) && <option value={draft.categoryIds}>Categoría aplicada: {draft.categoryIds}</option>}
          {categories.map(item => <option key={item.categoryId} value={item.categoryId}>{item.name}</option>)}
        </select>
        <img src="/figma/h5-catalog/chevron.svg" alt="" width="22" height="22" />
      </div>
      <div className="catalog-facet">
        <label className="sr-only" htmlFor={`${id}-brand`}>Marca</label>
        <select id={`${id}-brand`} disabled={options.status !== 'ready'} value={draft.brandIds} onChange={event => update('brandIds', event.target.value)}>
          <option value="">Marca</option>
          {draft.brandIds && !brands.some(item => item.brandId === draft.brandIds) && <option value={draft.brandIds}>Marca aplicada: {draft.brandIds}</option>}
          {brands.map(item => <option key={item.brandId} value={item.brandId}>{item.name}</option>)}
        </select>
        <img src="/figma/h5-catalog/chevron.svg" alt="" width="22" height="22" />
      </div>
      <fieldset className="catalog-price-range">
        <legend>Rango de precio</legend>
        <label className="sr-only" htmlFor={`${id}-min`}>Precio mínimo</label>
        <input id={`${id}-min`} placeholder="Desde S/" inputMode="decimal" type="text" value={draft.minPrice} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => update('minPrice', event.target.value)} />
        <label className="sr-only" htmlFor={`${id}-max`}>Precio máximo</label>
        <input id={`${id}-max`} placeholder="Hasta S/" inputMode="decimal" type="text" value={draft.maxPrice} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => update('maxPrice', event.target.value)} />
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
      <Button type="submit" disabled={Boolean(error)}>Aplicar filtros</Button>
      <Button variant="secondary" disabled={!Object.values(draft).some(Boolean) && !Object.values(filterDraft(query)).some(Boolean)} onClick={() => {
        const empty = { categoryIds: '', brandIds: '', minPrice: '', maxPrice: '' };
        setDraft(empty);
        onApply(catalogHref(query, empty));
      }}>Limpiar</Button>
    </div>
  </form>;
}

export function CatalogFilterPanel(props: Props) {
  return <aside className="catalog-filters-desktop" aria-label="Filtros del catálogo">
    <h2>Filtros</h2><FilterForm key={props.query} {...props} />
  </aside>;
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
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return <div className="catalog-filters">
    <Button className="catalog-filters-trigger" ref={trigger} size="sm" variant="secondary" aria-haspopup="dialog" aria-label={appliedCount ? `Filtros (${appliedCount})` : 'Filtros'} startIcon={<img src="/figma/h5-catalog/sliders.svg" alt="" width="22" height="22" />} onClick={() => {
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
      <h2 id={titleId} tabIndex={-1} ref={title}>Filtros</h2>
      <p className={`catalog-filter-summary${appliedCount ? '' : ' sr-only'}`} id={summaryId}>{appliedCount ? `${appliedCount} ${appliedCount === 1 ? 'filtro aplicado' : 'filtros aplicados'}` : 'Sin filtros aplicados'}</p>
      <FilterForm key={`${version}-${props.query}`} {...props} onApply={url => { closingAfterApply.current = true; dialog.current?.close(); props.onApply(url); }} />
      <Button variant="secondary" size="sm" className="catalog-filter-cancel" onClick={() => dialog.current?.close()}>Cancelar</Button>
    </dialog>
  </div>;
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
    {active.map(key => <button type="button" key={key} aria-label={`Quitar ${names[key]} ${labels[key]}`} onClick={() => onChange(catalogHref(query, { [key]: undefined }))}>
      {labels[key]} <img src="/figma/h5-catalog/close.svg" alt="" width="22" height="22" />
    </button>)}
    <button type="button" onClick={() => onChange(catalogHref(query, Object.fromEntries(filterKeys.map(key => [key, undefined]))))}>Limpiar filtros</button>
  </div>;
}
