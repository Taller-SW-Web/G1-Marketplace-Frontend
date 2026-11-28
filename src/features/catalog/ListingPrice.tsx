"use client";

import type { Ref } from "react";
import type { ListingPriceState } from "./hooks/useListingPrice";
import { formatMoney } from "./money";

export function ListingPrice({ priceRef, state }: { priceRef: Ref<HTMLDivElement>; state: ListingPriceState }) {
  return (
    <div className="listing-price" ref={priceRef} aria-busy={state.kind === "loading"}>
      {state.kind === "loading" && (
        <>
          <span className="listing-price-shimmer" aria-hidden="true" />
          <span className="sr-only">Consultando precio</span>
        </>
      )}
      {state.kind === "pending" && (
        <p className="commerce-badge commerce-badge--pending">Precio por confirmar</p>
      )}
      {state.kind === "ready" && (
        <>
          <p className="listing-price-current">
            {formatMoney(state.price.saleAmount ?? state.price.regularAmount, state.price.currency)}
          </p>
          {state.price.saleAmount !== null && (
            <div className="listing-price-offer">
              <s>{formatMoney(state.price.regularAmount, state.price.currency)}</s>
              {state.price.discountPercent !== null && (
                <span className="commerce-badge commerce-badge--offer">−{state.price.discountPercent} %</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
