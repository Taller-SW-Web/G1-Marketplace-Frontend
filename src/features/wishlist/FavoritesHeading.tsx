export function FavoritesHeading({ count, description }: { count?: number; description: string }) {
  return <div className="favorites-heading">
    <div className="favorites-title-row">
      <h1 id="favorites-title" tabIndex={-1}>Tus favoritos</h1>
      {count !== undefined && <p className="favorites-summary" role="status" aria-live="polite">{count} {count === 1 ? "producto" : "productos"}</p>}
    </div>
    <p>{description}</p>
  </div>;
}
