import Link from "next/link";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="feedback feedback-error">
      <span className="feedback-symbol" aria-hidden="true">
        !
      </span>
      <div>
        <h2>No pudimos mostrar esta selección</h2>
        <p role="alert">{message}</p>
        <div className="actions">
          <button className="button" onClick={onRetry}>
            Reintentar
          </button>
          <Link className="text-link" href="/catalogo">
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
export function MockNotice() {
  return (
    <p className="demo-notice" role="note">
      Catálogo de demostración <span>·</span> Productos e imágenes de prueba
    </p>
  );
}
export function ProductSkeletons() {
  return (
    <div aria-label="Cargando productos" role="status">
      <span className="sr-only">Cargando productos…</span>
      <div className="product-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton skeleton-image" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
