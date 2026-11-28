import Link from "next/link";
import "./status-pages.css";

export default function NotFound() {
  return (
    <div className="container empty-state status-page">
      <p className="status-page__code" aria-hidden="true">404</p>
      <p className="eyebrow">INKA ATHLETICS</p>
      <h1>No encontramos esta página</h1>
      <p>Puede que el enlace haya cambiado o que el producto ya no esté disponible. Puedes volver al catálogo y seguir explorando.</p>
      <div className="status-page__actions">
        <Link href="/catalogo" className="button">
          Volver al catálogo
        </Link>
        <Link href="/" className="button button--secondary button--md">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
