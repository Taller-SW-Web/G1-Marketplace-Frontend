import type { NextRequest } from "next/server";
import { moveWishlist } from "@/features/wishlist/list-server";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  return moveWishlist(request, (await context.params).productId);
}
