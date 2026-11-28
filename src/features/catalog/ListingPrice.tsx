"use client";

import { useListingPrice } from "./hooks/useListingPrice";
import { formatMoney } from "./money";

export function ListingPrice({ slug, productId }: { slug: string; productId: string }) {
  const { ref, state } = useListingPrice(slug, productId);
  return (
    <div className="listing-price" ref={ref} aria-busy={state.kind === "loading"}>
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
