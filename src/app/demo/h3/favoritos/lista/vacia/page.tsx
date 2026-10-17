import { notFound } from "next/navigation";
import { sandboxEnabled } from "@/features/wishlist/server";
import { FavoritesDemo } from "@/features/wishlist/FavoritesDemo";
export const dynamic = "force-dynamic";
export default function EmptyFavoritesPreview() {
  if (!sandboxEnabled()) notFound();
  return <div className="container favorites-page"><FavoritesDemo scenario="vacio" /></div>;
}
