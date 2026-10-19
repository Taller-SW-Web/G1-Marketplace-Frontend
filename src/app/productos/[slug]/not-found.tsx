import Link from "next/link";

/**
 * 404 de la ficha (producto inexistente o slug fuera de contrato): mantiene
 * el estado neutral de `ProductDetailContainer` (RC-F-011-03) pero responde
 * con HTTP 404 real.
 */
export default function ProductNotFound() {
  return (
    <div className="container product-page">
      <div className="detail-message">
        <h1>Producto no disponible</h1>
        <p>Vuelve al catálogo para seguir explorando.</p>
        <Link className="button" href="/catalogo">
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
