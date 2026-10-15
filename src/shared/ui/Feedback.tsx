import Link from "next/link";
import { Button } from "./Button";
import { LoadingState, Skeleton } from "./Skeleton";

export function ErrorState({ message, onRetry, home = false }: {
  message: string;
  onRetry: () => void;
  home?: boolean;
}) {
  return (
    <div className={`feedback feedback-error${home ? " feedback-error--home" : ""}`}>
      <img src={home ? "/figma/error-24.svg" : "/figma/refresh-32.svg"} alt="" width={home ? 24 : 32} height={home ? 24 : 32} />
      <h2>{home ? <>No pudimos cargar<br />el catálogo</> : "El catálogo no está disponible"}</h2>
      <p role="alert">{message}</p>
      <div className="actions">
        <Button onClick={onRetry}>Reintentar</Button>
        <Link className="text-link" href="/catalogo">Volver al catálogo</Link>
      </div>
    </div>
  );
}
export function MockNotice() {
  return <p className="demo-notice" role="note">Catálogo de demostración · Productos e imágenes de prueba</p>;
}
export function ProductSkeletons() {
  return (
    <LoadingState label="Cargando productos" className="product-grid">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <Skeleton className="skeleton-image" />
          <Skeleton variant="line" className="skeleton-line short" />
          <Skeleton variant="line" className="skeleton-line" />
          <Skeleton variant="line" className="skeleton-line short" />
        </div>
      ))}
    </LoadingState>
  );
}
