import type { NextRequest } from "next/server";
import { mutateWishlist } from "@/features/wishlist/server";
export const runtime = "nodejs";
export async function DELETE(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  return mutateWishlist(request, "DELETE", (await context.params).productId);
}
