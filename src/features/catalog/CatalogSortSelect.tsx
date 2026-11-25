"use client";
import { useId } from 'react';
export function CatalogSortSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="catalog-sort"><label className="sr-only" htmlFor={id}>Ordenar por</label>
    <div className="catalog-sort-control">
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        <option value="">Ordenar</option><option value="NAME_ASC">Nombre: A a Z</option><option value="NAME_DESC">Nombre: Z a A</option>
      </select>
      <img src="/figma/h5-catalog/chevron.svg" alt="" width="22" height="22" />
    </div>
  </div>;
}
