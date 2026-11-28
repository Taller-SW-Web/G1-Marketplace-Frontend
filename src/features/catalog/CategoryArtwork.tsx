import Image from "next/image";
import type { Category } from "./types";

export function CategoryArtwork({ category }: { category: Category; }) {
  const name = category.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Match the approved editorial art by category meaning, not by position or provider ID.
  const asset = /calzado|zapatilla|running|shoe/.test(name) ? "/figma/hero-shoe.png"
    : /ropa|indumentaria|textil|entrena|training|shirt/.test(name) ? "/figma/favorite-vest.png"
      : /equipamiento|accesorio|hidrat|bottle|agua|aire libre|outdoor|mochila|bag/.test(name) ? "/figma/favorite-bottle.png" : null;
  return (
    <span className="category-artwork" aria-hidden="true">
      {asset ? <Image src={asset} alt="" fill sizes="(max-width: 360px) 50vw, 33vw" /> : <span>Sin imagen</span>}
    </span>
  );
}
