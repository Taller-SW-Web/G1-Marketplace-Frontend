export const publishedOrderStates = [
  "CREADO",
  "PAGADO",
  "EN_PREPARACION",
  "DESPACHADO",
  "ENTREGADO",
  "ANULADO",
] as const;

export type PublishedOrderState = (typeof publishedOrderStates)[number];
export type OrderFilters = {
  state?: PublishedOrderState;
  from?: string;
  to?: string;
};
export type OrderFilterErrors = Partial<Record<keyof OrderFilters, string>>;

export const orderStateLabels: Record<PublishedOrderState, string> = {
  CREADO: "Creado",
  PAGADO: "Pagado",
  EN_PREPARACION: "En preparación",
  DESPACHADO: "Despachado",
  ENTREGADO: "Entregado",
  ANULADO: "Cancelado",
};

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

function addOneCalendarYear(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const nextYear = year + 1;
  const leap = nextYear % 4 === 0 && (nextYear % 100 !== 0 || nextYear % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return `${String(nextYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(Math.min(day, days[month - 1])).padStart(2, "0")}`;
}

export function validateOrderFilters(filters: OrderFilters): OrderFilterErrors {
  const errors: OrderFilterErrors = {};
  if (filters.from && !validCalendarDate(filters.from)) errors.from = "Usa una fecha válida.";
  if (filters.to && !validCalendarDate(filters.to)) errors.to = "Usa una fecha válida.";

  if (filters.from && filters.to && validCalendarDate(filters.from) && validCalendarDate(filters.to)) {
    if (filters.from > filters.to) {
      errors.from = "La fecha inicial no puede ser posterior a la fecha final.";
      errors.to = "La fecha final debe ser igual o posterior a la fecha inicial.";
    } else if (filters.to > addOneCalendarYear(filters.from)) {
      errors.from = "El rango no puede superar un año.";
      errors.to = "El rango no puede superar un año.";
    }
  }
  return errors;
}

export function hasOrderFilters(filters: OrderFilters): boolean {
  return Boolean(filters.state || filters.from || filters.to);
}
