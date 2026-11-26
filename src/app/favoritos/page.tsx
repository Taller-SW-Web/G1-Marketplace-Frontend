import type { Metadata } from "next";
import { wishlistCartEnabled } from "@/features/wishlist/add-server";
import { FavoritesContent } from "@/features/wishlist/FavoritesContent";

// Evaluate the integration opt-in at request time, rather than freezing build-time flags.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mis favoritos",
};

export default function FavoritesPage() {
  return (
    <div className="container favorites-page">
      <FavoritesContent cartEnabled={wishlistCartEnabled()} />
    </div>
  );
}
