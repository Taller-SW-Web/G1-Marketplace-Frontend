"use client";
import { useId } from 'react';
export function CatalogSortSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="catalog-sort"><label htmlFor={id}>Ordenar por</label>
    <div className="catalog-sort-control">
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        <option value="">Orden del catálogo</option><option value="NAME_ASC">Nombre: A a Z</option><option value="NAME_DESC">Nombre: Z a A</option>
      </select>
      <img src="/figma/catalog-sort-arrow-16.svg" alt="" width="16" height="16" />
    </div>
  </div>;
}
