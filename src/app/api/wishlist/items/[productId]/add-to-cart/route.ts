import type { NextRequest } from "next/server";
import { addFavoriteToCart } from "@/features/wishlist/add-server";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  return addFavoriteToCart(request, (await context.params).productId);
}
