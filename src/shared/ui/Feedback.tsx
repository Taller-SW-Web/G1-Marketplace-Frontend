import Link from "next/link";
import { Button } from "./Button";
import { LoadingState, Skeleton } from "./Skeleton";

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
          <Button onClick={onRetry}>Reintentar</Button>
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
    <LoadingState label="Cargando productos" className="product-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <Skeleton className="skeleton-image" />
          <Skeleton variant="line" className="skeleton-line" />
          <Skeleton variant="line" className="skeleton-line short" />
        </div>
      ))}
    </LoadingState>
  );
}
