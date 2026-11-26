"use client";
import type { PageMeta } from './types';
export function CatalogPagination({ page, busy = false, onChange }: { page: PageMeta; busy?: boolean; onChange: (page: number) => void }) {
  if (page.totalPages <= 1 || page.number >= page.totalPages) return null;
  return <nav className="pagination" aria-label="Paginación de productos" aria-busy={busy}>
    <button type="button" onClick={() => onChange(page.number - 1)} disabled={busy || page.number === 0}>← Anterior</button>
    <span aria-current="page">Página <strong>{page.number + 1}</strong> de {page.totalPages}</span>
    <button type="button" onClick={() => onChange(page.number + 1)} disabled={busy || page.number >= page.totalPages - 1}>Siguiente →</button>
  </nav>;
}
