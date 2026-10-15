import type { Category } from "./types";

// The illustration follows the category meaning, never its array position or ID.
// Unknown categories remain text-only until an appropriate resource is supplied.
export function CategoryArtwork({ category }: { category: Category; }) {
  const name = category.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const artwork = /hidrat|bottle|agua/.test(name) ? "bottle"
    : /calzado|zapatilla|running|shoe/.test(name) ? "shoe"
      : /ropa|entrena|training|shirt/.test(name) ? "shirt"
        : /accesorio|aire libre|outdoor|mochila|bag/.test(name) ? "bag" : null;
  if(!artwork) return null;
  return (
    <span className="category-artwork" aria-hidden="true">
      <img className="desktop-artwork" src={`/figma/category-${artwork}.svg`} alt="" width="280" height="186.67" />
      <img className="mobile-artwork" src={`/figma/category-${artwork}-mobile.svg`} alt="" width="139" height="92.6683" />
    </span>
  );
}
