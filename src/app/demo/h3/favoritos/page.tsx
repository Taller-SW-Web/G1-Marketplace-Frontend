import { notFound } from "next/navigation";
import { sandboxEnabled } from "@/features/wishlist/server";
import { WishlistDemo } from "@/features/wishlist/WishlistDemo";
export const dynamic = "force-dynamic";
export default function WishlistDemoPage() {
  if (!sandboxEnabled()) notFound();
  return <WishlistDemo />;
}
