import type { NextRequest } from "next/server";
import { changeSession, errorResponse, readSession, sandboxEnabled } from "@/features/wishlist/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return sandboxEnabled() ? readSession(request) : errorResponse("SANDBOX_DISABLED", 404);
}
export function POST(request: NextRequest) { return changeSession(request); }
