import type { Metadata } from "next";
import { FavoritesContent } from "@/features/wishlist/FavoritesContent";

export const metadata: Metadata = {
  title: "Mis favoritos",
};

export default function FavoritesPage() {
  return (
    <div className="container favorites-page">
      <FavoritesContent />
    </div>
  );
}
