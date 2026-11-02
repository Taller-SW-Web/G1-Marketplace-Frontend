import { notFound } from "next/navigation";
import { sandboxEnabled } from "@/features/wishlist/server";
import { FeedbackDemo } from "@/features/csat/FeedbackDemo";
export const dynamic = "force-dynamic";
export default function FeedbackPreview() {
  if (!sandboxEnabled()) notFound();
  return <div className="container favorites-page"><FeedbackDemo /></div>;
}
