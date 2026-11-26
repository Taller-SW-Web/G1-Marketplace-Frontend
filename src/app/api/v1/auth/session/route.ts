import { proxyAuth } from "@/features/auth/server";
export const GET = (request: Request) => proxyAuth(request, "session");
