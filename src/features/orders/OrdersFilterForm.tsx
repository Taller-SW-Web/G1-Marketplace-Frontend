"use client";

import { Button } from "@/shared/ui/Button";
import {
  orderStateLabels,
  publishedOrderStates,
  type OrderFilterErrors,
  type OrderFilters,
} from "./filters";

export function OrdersFilterForm({
  draft,
  errors,
  onChange,
  onApply,
  onClear,
}: {
  draft: OrderFilters;
  errors: OrderFilterErrors;
  onChange: (value: OrderFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <form className="orders-filter-form" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <div className="orders-filter-fields">
        <label className="orders-filter-field" htmlFor="orders-state">
          <span>Estado</span>
          <select
            id="orders-state"
            value={draft.state ?? ""}
            aria-invalid={Boolean(errors.state)}
            aria-describedby={errors.state ? "orders-state-error" : undefined}
            onChange={(event) => onChange({ ...draft, state: (event.target.value || undefined) as OrderFilters["state"] })}
          >
            <option value="">Todos los estados</option>
            {publishedOrderStates.map((state) => <option key={state} value={state}>{orderStateLabels[state]}</option>)}
          </select>
          {errors.state && <span className="orders-filter-error" id="orders-state-error">{errors.state}</span>}
        </label>
        <label className="orders-filter-field" htmlFor="orders-from">
          <span>Desde</span>
          <input
            id="orders-from"
            type="date"
            value={draft.from ?? ""}
            aria-invalid={Boolean(errors.from)}
            aria-describedby={errors.from ? "orders-from-error" : undefined}
            onChange={(event) => onChange({ ...draft, from: event.target.value || undefined })}
          />
          {errors.from && <span className="orders-filter-error" id="orders-from-error">{errors.from}</span>}
        </label>
        <label className="orders-filter-field" htmlFor="orders-to">
          <span>Hasta</span>
          <input
            id="orders-to"
            type="date"
            value={draft.to ?? ""}
            aria-invalid={Boolean(errors.to)}
            aria-describedby={errors.to ? "orders-to-error" : undefined}
            onChange={(event) => onChange({ ...draft, to: event.target.value || undefined })}
          />
          {errors.to && <span className="orders-filter-error" id="orders-to-error">{errors.to}</span>}
        </label>
      </div>
      <div className="orders-filter-actions">
        <Button type="submit" size="sm">Aplicar</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>Limpiar</Button>
      </div>
    </form>
  );
}
