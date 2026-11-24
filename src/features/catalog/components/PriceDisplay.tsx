"use client";
import { formatMoney, formatValidity } from "../money";
import type { PriceDTO } from "../types/product-price.types";

interface Props {
  price: PriceDTO;
  retrievedAt: string;
}

/**
 * Presentación coherente del precio vigente (`CMP-F012-002`).
 *
 * - Sin oferta: sólo importe actual (no “0 %” ni precio tachado).
 * - Con oferta: importe actual, referencia regular, porcentaje y vigencia.
 * - El descuento proviene del BFF; aquí no se recalculan reglas de Pricing.
 */
export function PriceDisplay({ price, retrievedAt }: Props) {
  const hasOffer = price.saleAmount !== null;
  const currentAmount = price.saleAmount ?? price.regularAmount;

  return (
    <div className="price-display">
      <p className="price-current">
        <span className="sr-only">Precio actual: </span>
        <span>{formatMoney(currentAmount, price.currency)}</span>
      </p>

      {hasOffer && (
        <p className="price-offer">
          <span className="price-badge">
            Oferta
            {price.discountPercent !== null && (
              <span className="price-discount">
                {" "}
                −{price.discountPercent} %
              </span>
            )}
          </span>
          <span className="price-reference">
            <span>Precio regular: </span>
            <s>{formatMoney(price.regularAmount, price.currency)}</s>
          </span>
        </p>
      )}

      {hasOffer && price.validUntil !== null && (
        <p className="price-validity">
          Oferta válida hasta {formatValidity(price.validUntil)}
        </p>
      )}

      <p className="price-note">
        Precio informativo; se revalida al confirmar el pedido.
        <span className="sr-only">
          {" "}
          Consultado el {formatValidity(retrievedAt)}.
        </span>
      </p>
    </div>
  );
}
