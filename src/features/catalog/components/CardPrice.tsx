import { formatMoney } from "../money";
import type { PriceDTO } from "../types/product-price.types";

export function CardPrice({ price, className }: { price: PriceDTO; className: string }) {
  const { currency, regularAmount, saleAmount } = price;
  return <p className={className}>
    <span><span className="sr-only">Precio actual: </span>{formatMoney(saleAmount ?? regularAmount, currency)}</span>
    {saleAmount !== null && <s><span className="sr-only">Precio regular: </span>{formatMoney(regularAmount, currency)}</s>}
  </p>;
}
