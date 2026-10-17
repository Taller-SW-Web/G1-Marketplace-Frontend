import type { NextRequest } from "next/server";
import { mutateWishlist } from "@/features/wishlist/server";
export const runtime = "nodejs";
export function POST(request: NextRequest) { return mutateWishlist(request, "POST"); }
