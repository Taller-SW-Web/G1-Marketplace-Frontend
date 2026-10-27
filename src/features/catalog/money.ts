/**
 * Formato de importes y vigencias con la configuración acordada:
 * `es-PE` y zona `America/Lima` (RN-F012-04 / RN-F012-06).
 */

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Moneda no soportada por Intl: se muestra el código ISO sin conversión.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export function formatValidity(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}
