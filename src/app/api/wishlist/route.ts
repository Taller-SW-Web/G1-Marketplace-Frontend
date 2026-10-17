import type { NextRequest } from "next/server";
import { readWishlist } from "@/features/wishlist/list-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return readWishlist(request); }
