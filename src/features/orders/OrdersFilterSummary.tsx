"use client";

import { orderStateLabels, type OrderFilters } from "./filters";

export function OrdersFilterSummary({
  filters,
  onRemove,
}: {
  filters: OrderFilters;
  onRemove: (key: keyof OrderFilters) => void;
}) {
  const active: Array<{ key: keyof OrderFilters; label: string }> = [];
  if (filters.state) active.push({ key: "state", label: `Estado: ${orderStateLabels[filters.state] ?? filters.state}` });
  if (filters.from) active.push({ key: "from", label: `Desde: ${filters.from}` });
  if (filters.to) active.push({ key: "to", label: `Hasta: ${filters.to}` });
  if (!active.length) return null;

  return (
    <div className="orders-filter-summary" aria-label="Filtros aplicados">
      <span className="orders-filter-summary__title">Filtros aplicados:</span>
      {active.map(({ key, label }) => (
        <button
          className="orders-filter-chip"
          type="button"
          key={key}
          onClick={() => onRemove(key)}
          aria-label={`Quitar filtro ${label}`}
        >
          <span>{label}</span><span aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  );
}
