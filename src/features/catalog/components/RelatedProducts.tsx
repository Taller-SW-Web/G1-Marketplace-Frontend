"use client";
import Link from "next/link";
import { formatMoney } from "../money";
import type {
  RecommendationCardDTO,
  RelatedProductsState,
} from "../types/product-recommendations.types";

interface Props {
  state: RelatedProductsState;
}

/**
 * `CMP-F015-001` · RelatedProducts — hasta 8 tarjetas completas, sólo
 * navegación. El BFF ya ordena, filtra y enriquece; aquí no se reordena.
 */
export function RelatedProducts({ state }: Props) {
  if (state.kind === "omitted") return null;

  return (
    <section className="related-products" aria-labelledby="related-title">
      <h2 id="related-title">Productos relacionados</h2>
      {state.kind === "loading" ? (
        <div className="related-grid" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div className="related-card related-card--skeleton" key={index}>
              <div className="related-media" />
              <div className="related-copy">
                <span className="skeleton skeleton--line" />
                <span className="skeleton skeleton--line short" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="related-grid">
          {state.data.map((card) => (
            <li key={card.productId}>
              <RelatedCard card={card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RelatedCard({ card }: { card: RecommendationCardDTO }) {
  return (
    <Link
      className="related-card"
      href={`/productos/${encodeURIComponent(card.slug)}`}
    >
      <div className="related-media">
        <img
          src={card.image.url}
          alt={card.image.alt}
          loading="lazy"
          width="280"
          height="187"
        />
      </div>
      <div className="related-copy">
        <p className="related-name">{card.name}</p>
        {card.price !== null && (
          <p className="related-price">
            {formatMoney(card.price.amount, card.price.currency)}
          </p>
        )}
      </div>
    </Link>
  );
}
