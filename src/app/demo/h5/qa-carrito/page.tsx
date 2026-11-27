import { notFound } from "next/navigation";
import { CartOverlayFixtures } from "./CartOverlayFixtures";

export default function CartOverlayQaPage() {
  if (process.env.NODE_ENV !== "development" || process.env.H5_CART_OVERLAY_QA !== "true") {
    notFound();
  }
  return <CartOverlayFixtures />;
}
